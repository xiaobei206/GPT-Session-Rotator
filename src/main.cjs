const { app, BrowserWindow, BrowserView, ipcMain, session, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { analyzeConversationLimitSnapshot, createConversationLimitConfirmationState, observeConversationLimitEvidence, CONVERSATION_LIMIT_SCAN_SCRIPT } = require('./conversation-limit.cjs');
const { analyzeAssistantCompletionSnapshot, createAssistantCompletionState, observeAssistantCompletion, ASSISTANT_COMPLETION_SCAN_SCRIPT, normalizeAssistantCompletionMarker } = require('./assistant-completion.cjs');
const { fetchLatestCommit, createGithubMonitorState, observeGithubCommit, GITHUB_POLL_INTERVAL_MS, GITHUB_DEFAULT_QUIET_THRESHOLD_MS, normalizeGithubQuietThresholdMinutes } = require('./github-monitor.cjs');
const { loadGithubQuietThresholdMinutes, saveGithubQuietThresholdMinutes, loadAssistantCompletionMarker, saveAssistantCompletionMarker } = require('./settings.cjs');

const VERSION = '0.1.14';
const PARTITION = 'persist:gpt-session-rotator';
const CHATGPT_HOME = 'https://chatgpt.com/';
const HEADER_HEIGHT = 54;
const DASHBOARD_HEIGHT = 300;
const BROWSER_VIEW_TOP = HEADER_HEIGHT + DASHBOARD_HEIGHT;
const STEP_DELAY_MS = 20_000;
const NEW_CHAT_DELAY_MS = 30_000;
const THINK_RETRY_DELAY_MS = 30_000;
const DEFAULT_CYCLE_DELAY_MS = 45 * 60_000;

let win;
let view;
let statsPath;
let settingsPath;
let githubQuietThresholdMs = GITHUB_DEFAULT_QUIET_THRESHOLD_MS;
let assistantCompletionMarker = '结束任务简报';
let totalCycles = 0;
let proxyConfig = { enabled: false, type: 'socks5', host: '127.0.0.1', port: '7890' };
const scheduler = {
  running: false,
  prompt: '',
  thinkingEnabled: true,
  intervalMs: DEFAULT_CYCLE_DELAY_MS,
  cycle: 0,
  timer: null,
  nextRunAt: null,
  activeRun: null,
  githubMonitorState: createGithubMonitorState(),
  githubBaselinePending: false,
  lastGithubCommit: null,
  pendingGithubRotation: null
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function loadStats() {
  statsPath = path.join(app.getPath('userData'), 'stats.json');
  try {
    const data = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    totalCycles = Number.isSafeInteger(data.totalCycles) && data.totalCycles >= 0 ? data.totalCycles : 0;
  } catch {
    totalCycles = 0;
  }
}

function loadSettings() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  const minutes = loadGithubQuietThresholdMinutes(settingsPath);
  githubQuietThresholdMs = minutes * 60_000;
  assistantCompletionMarker = loadAssistantCompletionMarker(settingsPath);
}

function saveSettings() {
  if (!settingsPath) return false;
  try {
    saveGithubQuietThresholdMinutes(settingsPath, Math.round(githubQuietThresholdMs / 60_000));
    return true;
  } catch {
    return false;
  }
}

function updateAssistantCompletionMarker(value) {
  const marker = normalizeAssistantCompletionMarker(value);
  if (String(value ?? '').normalize('NFKC').trim().length > 100) {
    return { ok:false, reason:'助手结束回显标记最多 100 个字符。' };
  }
  assistantCompletionMarker = marker;
  let persisted = false;
  try {
    if (settingsPath) {
      saveAssistantCompletionMarker(settingsPath, marker);
      persisted = true;
    }
  } catch {}
  emitProgress('结束回显标记更新', marker
    ? `助手结束回显标记已设为“${marker}”；${persisted ? '配置已保存' : '当前运行已应用但未能保存配置'}。`
    : `已关闭助手结束回显标记自动轮换；红框提示与 GitHub 监测仍然有效。${persisted ? '配置已保存。' : '当前运行已应用但未能保存配置。'}`,
    persisted ? 'success' : 'warning', scheduler.cycle);
  return { ok:true, marker, persisted };
}

function updateGithubQuietThreshold(minutes) {
  const normalized = normalizeGithubQuietThresholdMinutes(minutes);
  if (normalized === null) {
    return { ok:false, reason:'GitHub 静默阈值必须是 1–180 之间的整数分钟。' };
  }

  githubQuietThresholdMs = normalized * 60_000;
  const persisted = saveSettings();

  if (scheduler.running && scheduler.lastGithubCommit && scheduler.githubMonitorState) {
    const observation = observeGithubCommit(scheduler.githubMonitorState, scheduler.lastGithubCommit, githubQuietThresholdMs);
    if (observation.shouldRotate) {
      scheduler.pendingGithubRotation = { sha:scheduler.lastGithubCommit.sha, ageMs:scheduler.lastGithubCommit.ageMs, thresholdMs:githubQuietThresholdMs };
      emitProgress('GitHub阈值即时触发', `静默阈值已调整为 ${normalized} 分钟；当前候选提交 ${scheduler.lastGithubCommit.sha.slice(0, 7)} 已达到新阈值，将立即开启下一轮。`, 'success', scheduler.cycle);
    }
  }

  emitProgress('GitHub静默阈值更新', `GitHub main 分支静默阈值已设为 ${normalized} 分钟；${persisted ? '配置已保存' : '本次运行已生效但未能保存配置'}${scheduler.running ? '，运行中的轮换立即应用' : ''}。`, persisted ? 'success' : 'warning', scheduler.cycle);
  return { ok:true, minutes:normalized, persisted };
}

function saveStats() {
  if (!statsPath) return;
  try {
    const tempPath = `${statsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({ totalCycles, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    fs.renameSync(tempPath, statsPath);
  } catch (error) {
    emitProgress('统计保存提示', `累计轮次暂时无法写入本地文件：${error.message || error}`, 'warning');
  }
}

function emitProgress(event, message, level = 'info', cycle = scheduler.cycle, extra = {}) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('automation:progress', {
      event, message, level, cycle, totalCycles, at: Date.now(),
      nextRunAt: scheduler.nextRunAt,
      ...extra
    });
  }
}

function throwIfCancelled(run) {
  if (run?.cancelled || !scheduler.running) {
    const error = new Error('用户停止了自动轮换。');
    error.code = 'RUN_CANCELLED';
    throw error;
  }
}

async function waitFor(run, durationMs, label, event = '固定等待') {
  emitProgress(event, `${label}：等待 ${Math.round(durationMs / 1000)} 秒。`, 'info', run.cycle);
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    throwIfCancelled(run);
    await sleep(Math.min(250, deadline - Date.now()));
  }
}

const CONVERSATION_LIMIT_POLL_MS = 1500;
const CONVERSATION_LIMIT_CONFIRM_MS = 5000;
const CONVERSATION_LIMIT_CONFIRM_MAX_GAP_MS = 3500;

async function fetchLatestMainCommit() {
  const ses = session.fromPartition(PARTITION);
  return fetchLatestCommit({
    fetchImpl:(url, init) => ses.fetch(url, init),
    timeoutMs:15_000
  });
}

async function primeGithubMonitorBaseline(monitorState) {
  scheduler.githubBaselinePending = true;
  try {
    const commit = await fetchLatestMainCommit();
    if (scheduler.githubMonitorState !== monitorState || !scheduler.running) return;
    scheduler.lastGithubCommit = commit;
    const observation = observeGithubCommit(monitorState, commit, githubQuietThresholdMs);
    if (observation.status === 'baseline') {
      emitProgress('GitHub启动基线', `已在自动轮换启动时记录 main 分支基线 ${commit.sha.slice(0, 7)}。旧提交不会触发提前轮换；只监测启动后出现的新提交。`, 'info', scheduler.cycle);
    }
  } catch (error) {
    if (scheduler.githubMonitorState === monitorState && scheduler.running) {
      emitProgress('GitHub基线暂不可用', `启动时暂时无法读取 GitHub main 分支：${error.message || error}。不会触发提前轮换；首次成功读取只建立基线。`, 'warning', scheduler.cycle);
    }
  } finally {
    if (scheduler.githubMonitorState === monitorState) scheduler.githubBaselinePending = false;
  }
}

async function captureAssistantResponseBaseline(wc, run) {
  try {
    const snapshot = await wc.executeJavaScript(ASSISTANT_COMPLETION_SCAN_SCRIPT, true);
    const baselineMessages = Array.isArray(snapshot?.assistantMessages) ? snapshot.assistantMessages : [];
    run.assistantResponseBaseline = {
      count:Number.isInteger(snapshot?.assistantCount) ? snapshot.assistantCount : 0,
      ids:baselineMessages.map(message => String(message.id || '')).filter(Boolean),
      // Retain only empty message IDs, never historical assistant response text.
      emptyIds:baselineMessages.filter(message => !String(message.text || '').trim()).map(message => String(message.id || '')).filter(Boolean)
    };
    run.assistantBaselineCaptured = true;
    emitProgress('回显监测基线', `已记录本轮提交前的助手回复基线（${run.assistantResponseBaseline.count} 条，其中 ${run.assistantResponseBaseline.emptyIds.length} 个空占位节点）；空节点后续被本轮回复填充时也会识别，已有内容的旧消息仍被排除。`, 'info', run.cycle);
  } catch (error) {
    run.assistantBaselineCaptured = false;
    run.assistantResponseBaseline = null;
    emitProgress('回显基线提示', `无法建立提交前的助手回复基线：${error.message || error}；本轮仍监测红框提示和 GitHub，不会用旧回复误触发。`, 'warning', run.cycle);
  }
}

async function waitForNextCycleWindow(run, wc, durationMs, { checkConversationLimit = true, checkAssistantCompletion = true } = {}) {
  const startedAt = Date.now();
  const deadline = startedAt + durationMs;
  let nextProbeAt = 0;
  let nextGithubProbeAt = startedAt;
  let probeFailures = 0;
  let githubFailures = 0;
  let githubRequestInFlight = false;
  let githubResult = null;
  const conversationLimitConfirmation = createConversationLimitConfirmationState();
  const assistantCompletionConfirmation = createAssistantCompletionState();
  let conversationLimitPendingLogged = false;
  let assistantProbeFailures = 0;
  let assistantMarkerStatusKey = null;
  let assistantFirstProbeLogged = false;

  const startGithubProbe = () => {
    if (githubRequestInFlight) return;
    // Schedule from request start, and keep the network operation off the
    // automation loop so a slow API cannot delay manual timing or UI scans.
    nextGithubProbeAt = Date.now() + GITHUB_POLL_INTERVAL_MS;
    githubRequestInFlight = true;
    fetchLatestMainCommit().then(
      commit => { githubResult = { ok:true, commit }; },
      error => { githubResult = { ok:false, error }; }
    ).finally(() => { githubRequestInFlight = false; });
  };

  while (Date.now() < deadline) {
    if (run.cancelled || !scheduler.running) return { reason:'stopped' };
    if (scheduler.pendingGithubRotation) {
      const pending = scheduler.pendingGithubRotation;
      scheduler.pendingGithubRotation = null;
      return { reason:'github-quiet', commit:{ sha:pending.sha, ageMs:pending.ageMs }, thresholdChanged:true };
    }

    const now = Date.now();
    if (githubResult) {
      const result = githubResult;
      githubResult = null;
      if (result.ok) {
        const commit = result.commit;
        scheduler.lastGithubCommit = commit;
        if (githubFailures > 0) {
          emitProgress('GitHub检测恢复', 'GitHub API 已恢复，继续按 90 秒间隔监测 main 分支。', 'success', run.cycle);
        }
        githubFailures = 0;

        const observation = observeGithubCommit(scheduler.githubMonitorState, commit, githubQuietThresholdMs);
        if (observation.status === 'baseline') {
          emitProgress('GitHub启动基线', `已记录启动时 main 分支的基线提交 ${commit.sha.slice(0, 7)}。此提交早于本次运行，不会触发立即轮换；只有运行期间出现新提交，且之后静默满 ${Math.round(githubQuietThresholdMs / 60_000)} 分钟，才会提前轮换。`, 'info', run.cycle);
        } else if (observation.status === 'new-commit') {
          emitProgress('GitHub检测到新提交', `main 分支出现本次运行启动后的新提交 ${commit.sha.slice(0, 7)}；开始监测其后续静默时间。`, 'info', run.cycle);
        } else if (observation.status === 'baseline-restored') {
          emitProgress('GitHub提交回退', `main 分支回到启动基线 ${commit.sha.slice(0, 7)}；清除未触发的候选提交，不提前轮换。`, 'info', run.cycle);
        }

        if (observation.shouldRotate) {
          emitProgress('GitHub静默触发', `本次运行期间出现的 main 分支提交 ${commit.sha.slice(0, 7)} 已静默满 ${Math.round(githubQuietThresholdMs / 60_000)} 分钟，提前结束等待并立即开启下一轮。`, 'success', run.cycle, { earlyRotation:true, trigger:'github-quiet', commitSha:commit.sha });
          return { reason:'github-quiet', commit };
        }
      } else {
        githubFailures += 1;
        const error = result.error;
        if (githubFailures === 1 || githubFailures % 10 === 0) {
          emitProgress('GitHub检测暂不可用', `暂时无法读取 main 分支最新提交：${error?.message || String(error)}。不会影响原人工计时，稍后继续重试。`, 'warning', run.cycle);
        }
      }
    }

    if (!scheduler.githubBaselinePending && !githubRequestInFlight && now >= nextGithubProbeAt) startGithubProbe();

    if ((checkConversationLimit || checkAssistantCompletion) && wc && !wc.isDestroyed() && now >= nextProbeAt) {
      nextProbeAt = now + CONVERSATION_LIMIT_POLL_MS;

      if (checkAssistantCompletion && run.assistantBaselineCaptured) {
        try {
          const snapshot = await wc.executeJavaScript(ASSISTANT_COMPLETION_SCAN_SCRIPT, true);
          if (!assistantFirstProbeLogged) {
            assistantFirstProbeLogged = true;
            const count = Number.isInteger(snapshot?.assistantCount) ? snapshot.assistantCount : (snapshot?.assistantMessages?.length || 0);
            emitProgress('结束回显扫描', `页面检测器已正常读取助手消息节点 ${count} 条；正在等待本轮标记“${assistantCompletionMarker}”。回复正文只在内存中用于匹配，不会写入日志。`, 'info', run.cycle);
          }
          const detected = analyzeAssistantCompletionSnapshot(snapshot, assistantCompletionMarker, run.assistantResponseBaseline);
          const confirmation = observeAssistantCompletion(assistantCompletionConfirmation, detected, Date.now());

          if (detected) {
            const fingerprint = `${detected.messageId}|${detected.marker}`;
            if (confirmation.status === 'generating' && assistantMarkerStatusKey !== `generating:${fingerprint}`) {
              emitProgress('结束回显已识别', `已在本轮新增助手回复中找到标记“${detected.marker}”，但 ChatGPT 仍处于生成状态；等待生成结束后再轮换。`, 'info', run.cycle);
              assistantMarkerStatusKey = `generating:${fingerprint}`;
            } else if (confirmation.status === 'started' && assistantMarkerStatusKey !== `confirming:${fingerprint}`) {
              emitProgress('结束回显待确认', `已找到本轮标记“${detected.marker}”，生成状态已结束；正在进行稳定性复核。`, 'info', run.cycle);
              assistantMarkerStatusKey = `confirming:${fingerprint}`;
            }
            if (confirmation.confirmed) {
              const evidence = { marker:detected.marker, messageId:detected.messageId, confirmedDurationMs:confirmation.elapsedMs, elapsedMs:Date.now() - startedAt };
              emitProgress('任务结束回显', `本轮助手回复已出现结束标记“${detected.marker}”，且确认生成结束；不再等待剩余时间，立即开启下一轮。`, 'success', run.cycle, { earlyRotation:true, trigger:'assistant-completion-marker', detection:evidence });
              return { reason:'assistant-completion-marker', evidence };
            }
          } else {
            assistantMarkerStatusKey = null;
          }
        } catch (error) {
          observeAssistantCompletion(assistantCompletionConfirmation, null);
          assistantProbeFailures += 1;
          if (assistantProbeFailures === 1 || assistantProbeFailures % 20 === 0) {
            emitProgress('结束回显检测提示', `助手回复检测暂时失败（${assistantProbeFailures} 次）：${error.message || error}；继续人工等待并保留其他监测。`, 'warning', run.cycle);
          }
        }
      }

      if (checkConversationLimit) {
        try {
          const snapshot = await wc.executeJavaScript(CONVERSATION_LIMIT_SCAN_SCRIPT, true);
          const detected = analyzeConversationLimitSnapshot(snapshot);
          const confirmation = observeConversationLimitEvidence(
            conversationLimitConfirmation, detected, Date.now(),
            CONVERSATION_LIMIT_CONFIRM_MS, CONVERSATION_LIMIT_CONFIRM_MAX_GAP_MS
          );
          if (confirmation.status === 'started' && !conversationLimitPendingLogged) {
            conversationLimitPendingLogged = true;
            emitProgress('长度提示待确认', `已在主内容区域 DOM 中识别到${detected.language === 'zh-CN' ? '中文' : '英文'}红框提示（不受当前滚动位置影响）；需连续保持 5 秒才会提前轮换。`, 'info', run.cycle);
          } else if (confirmation.status === 'not-detected') {
            conversationLimitPendingLogged = false;
          }
          if (confirmation.confirmed) {
            const evidence = { ...detected, confirmedDurationMs:confirmation.elapsedMs, elapsedMs:Date.now() - startedAt };
            emitProgress('对话长度上限', `主内容区域的${evidence.language === 'zh-CN' ? '中文' : '英文'}红框长度上限提示已连续确认 5 秒，提前结束等待并立即开启下一轮。`, 'warning', run.cycle, { earlyRotation:true, trigger:'conversation-limit', detection:evidence });
            return { reason:'conversation-limit', evidence };
          }
        } catch (error) {
          observeConversationLimitEvidence(conversationLimitConfirmation, null);
          conversationLimitPendingLogged = false;
          probeFailures += 1;
          // UI detection is optional: any failure must leave the timer and GitHub watcher running.
          if (probeFailures === 1 || probeFailures % 20 === 0) {
            emitProgress('长度检测提示', `页面长度提示检测暂时失败（${probeFailures} 次）：${error.message || error}；继续等待并保留 GitHub 监测。`, 'warning', run.cycle);
          }
        }
      }
    }

    await sleep(Math.min(250, Math.max(1, deadline - Date.now())));
  }

  return { reason:'interval-elapsed', probeFailures, githubFailures };
}

async function waitStep(run, label) {
  await waitFor(run, STEP_DELAY_MS, label, '固定等待');
}

function proxyRules(cfg) {
  const host = (cfg.host || '').trim();
  const port = String(cfg.port || '').trim();
  if (!host || !/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('代理地址或端口无效。');
  }
  if (cfg.type === 'socks5') return `socks5://${host}:${port}`;
  if (cfg.type === 'http') return `http://${host}:${port}`;
  throw new Error('不支持的代理类型。');
}

async function applyProxy(cfg) {
  const ses = session.fromPartition(PARTITION);
  if (cfg.enabled) {
    await ses.setProxy({ proxyRules: proxyRules(cfg), proxyBypassRules: '<local>' });
  } else {
    await ses.setProxy({ mode: 'direct' });
  }
  proxyConfig = { ...cfg };
  if (view) await view.webContents.loadURL(CHATGPT_HOME);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    title: `GPT Session Rotator ${VERSION}`,
    backgroundColor: '#10151d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  view = new BrowserView({
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: true
    }
  });
  win.setBrowserView(view);
  const resize = () => {
    if (!win || !view || view.webContents.isDestroyed()) return;
    const [width, height] = win.getContentSize();
    const y = Math.min(BROWSER_VIEW_TOP, Math.max(260, height - 300));
    view.setBounds({ x: 0, y, width, height: Math.max(200, height - y) });
  };
  win.on('resize', resize);
  win.on('maximize', resize);
  win.on('unmaximize', resize);
  win.loadFile(path.join(__dirname, 'index.html'));
  resize();
  void view.webContents.loadURL(CHATGPT_HOME).catch(error => {
    emitProgress('浏览器加载提示', `首次打开 ChatGPT 时发生错误：${error.message || error}`, 'warning', 0);
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://chatgpt.com/')) void view.webContents.loadURL(url);
    return { action: 'deny' };
  });
  win.on('closed', () => {
    stopScheduler('主窗口已关闭');
    win = null;
    view = null;
  });
}

const PAGE_STATE_SCRIPT = `(() => {
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const selectors = ['#prompt-textarea','[data-testid="prompt-textarea"]','textarea[placeholder]','[contenteditable="true"]'];
  let editor = null;
  for (const selector of selectors) {
    editor = [...document.querySelectorAll(selector)].find(el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true');
    if (editor) break;
  }
  const path = location.pathname || '/';
  const isConversationRoute = /\\/c\\/[^/]+/.test(path);
  const controls = [...document.querySelectorAll('button,[role="button"]')].filter(visible);
  const labels = controls.map(el => [el.getAttribute('aria-label'),el.getAttribute('data-testid'),el.title,el.innerText].filter(Boolean).join(' ').replace(/\\s+/g,' ').trim()).filter(Boolean);
  return {
    href: location.href,
    pathname: path,
    title: document.title,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    isConversationRoute,
    hasComposer: !!editor,
    editorTag: editor?.tagName || '',
    visibleControlCount: controls.length,
    controlSamples: labels.slice(0, 24)
  };
})()`;

const ENSURE_SIDEBAR_SCRIPT = `(() => {
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const norm = value => String(value || '').replace(/\\s+/g, ' ').trim();
  const controls = [...document.querySelectorAll('button,[role="button"]')].filter(visible);
  const info = el => norm([el.getAttribute('aria-label'),el.getAttribute('title'),el.getAttribute('data-testid'),el.innerText].filter(Boolean).join(' '));
  const open = controls.find(el => /open-sidebar|show-sidebar|expand-sidebar/i.test(info(el)) || /(open|show|expand) sidebar/i.test(info(el)) || /(显示|展开|打开)侧边栏/.test(info(el)));
  if (open) {
    open.click();
    return { status:'opened', label:info(open) };
  }
  const close = controls.find(el => /close-sidebar|hide-sidebar/i.test(info(el)) || /(close|hide) sidebar/i.test(info(el)) || /(隐藏|关闭)侧边栏/.test(info(el)));
  if (close) return { status:'already_open', label:info(close) };
  const side = [...document.querySelectorAll('nav,[data-testid*="sidebar"],[class*="sidebar"]')].find(visible);
  return side ? { status:'probably_open', label:'检测到可见侧栏区域，但没有明确的切换按钮。' }
    : { status:'unknown', label:'没有找到明确的侧边栏展开/收起控件。' };
})()`;

// Deliberately conservative Think detection: only exact mode labels/menu options
// or explicit model-selector controls are actionable. Generic text containing
// “think/思考” is not enough to click.
const THINK_INSPECT_AND_SELECT_SCRIPT = `(() => {
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const norm = value => String(value || '').replace(/\\s+/g, ' ').trim();
  const fullLabel = el => norm([el.innerText,el.getAttribute('aria-label'),el.getAttribute('title'),el.getAttribute('data-testid')].filter(Boolean).join(' '));
  const mainText = el => norm(el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '');
  const selected = el => el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true' ||
    el.getAttribute('aria-pressed') === 'true' || el.getAttribute('data-state') === 'checked' ||
    el.getAttribute('data-state') === 'on' || el.getAttribute('data-selected') === 'true' ||
    el.getAttribute('aria-current') === 'true' || /(^|\\s)(active|selected|checked)(\\s|$)/i.test(String(el.className || ''));
  const isThinkingChoice = text => {
    const t = norm(text);
    if (/remove|learn|help|about|了解|帮助|移除|介绍/i.test(t)) return false;
    return /^(thinking|think)(\\s|$|[-(])|^(思考|深度思考)([\\s（(]|$)/i.test(t);
  };
  const menuRoots = [...document.querySelectorAll('[role="menu"],[role="listbox"],[data-radix-menu-content],[data-state="open"][role]')].filter(visible);
  const menuItems = [...document.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="option"],[role="radio"],[role="menuitemcheckbox"],[role="menu"] button,[role="listbox"] button,[data-radix-menu-content] button,[data-radix-menu-content] [role="button"]')].filter(visible);
  const choice = menuItems.find(el => isThinkingChoice(mainText(el)) || isThinkingChoice(fullLabel(el)));
  if (choice) {
    if (selected(choice)) return { status:'confirmed', detail:'模型菜单中的 Thinking 选项已明确处于选中状态。', label:fullLabel(choice) };
    if (window.__gptSessionRotatorThinkOptionClicked) return { status:'waiting', detail:'Thinking 选项已点击一次，等待界面状态更新。', label:fullLabel(choice) };
    window.__gptSessionRotatorThinkOptionClicked = true;
    choice.click();
    return { status:'choice_clicked', detail:'已点击模型菜单中的 Thinking 选项；需要再次查看选中状态。', label:fullLabel(choice) };
  }

  const controls = [...document.querySelectorAll('button,[role="button"]')].filter(visible);
  const modelSelector = controls.find(el => {
    const t = fullLabel(el);
    const id = String(el.getAttribute('data-testid') || '');
    const hasPickerState = el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-expanded') || el.hasAttribute('data-state');
    return /model-selector|model-switcher|model-picker/i.test(id) ||
      (hasPickerState && /model|模型|选择模型|\\b(gpt|auto|instant|thinking)\\b|深度思考|思考模式/i.test(t));
  });

  if (modelSelector && /thinking|深度思考|思考模式/i.test(mainText(modelSelector)) && menuRoots.length === 0) {
    return { status:'confirmed', detail:'模型选择器当前明确显示 Thinking。', label:fullLabel(modelSelector) };
  }
  if (modelSelector) {
    if (modelSelector.getAttribute('aria-expanded') === 'true' || modelSelector.getAttribute('data-state') === 'open' || menuRoots.length) {
      return { status:'waiting', detail:'模型选择菜单已经展开，正在等待 Thinking 选项出现。', label:fullLabel(modelSelector) };
    }
    if (!window.__gptSessionRotatorModelPickerClicked) {
      window.__gptSessionRotatorModelPickerClicked = true;
      modelSelector.click();
      return { status:'picker_opened', detail:'已打开模型选择菜单，等待 Thinking 选项。', label:fullLabel(modelSelector) };
    }
    return { status:'waiting', detail:'模型选择菜单已尝试打开一次，避免重复点击关闭菜单。', label:fullLabel(modelSelector) };
  }

  const exactThinkControl = controls.find(el => {
    const text = mainText(el);
    const id = String(el.getAttribute('data-testid') || '');
    return /^(think|thinking|思考|深度思考)(一下)?$/i.test(text) || /think-mode-toggle|thinking-toggle/i.test(id);
  });
  if (exactThinkControl) {
    if (selected(exactThinkControl)) return { status:'confirmed', detail:'Think 模式开关明确显示为启用。', label:fullLabel(exactThinkControl) };
    const isPickerTrigger = exactThinkControl.hasAttribute('aria-haspopup') || exactThinkControl.hasAttribute('aria-expanded') || ['open','closed'].includes(exactThinkControl.getAttribute('data-state'));
    if (isPickerTrigger) {
      if (exactThinkControl.getAttribute('aria-expanded') === 'true' || exactThinkControl.getAttribute('data-state') === 'open') {
        return { status:'waiting', detail:'Think 菜单已展开，暂未出现 Thinking 选项。', label:fullLabel(exactThinkControl) };
      }
      if (window.__gptSessionRotatorThinkPickerClicked) return { status:'waiting', detail:'Think 菜单触发按钮已点击一次，等待菜单内容更新。', label:fullLabel(exactThinkControl) };
      window.__gptSessionRotatorThinkPickerClicked = true;
      exactThinkControl.click();
      return { status:'picker_opened', detail:'已打开 Think 控件菜单，等待 Thinking 选项。', label:fullLabel(exactThinkControl) };
    }
    if (exactThinkControl.getAttribute('aria-pressed') === 'false' || exactThinkControl.getAttribute('aria-checked') === 'false') {
      if (window.__gptSessionRotatorThinkToggleClicked) return { status:'waiting', detail:'Think 开关已点击一次，等待状态更新。', label:fullLabel(exactThinkControl) };
      window.__gptSessionRotatorThinkToggleClicked = true;
      exactThinkControl.click();
      return { status:'toggle_clicked', detail:'已点击明确标记为关闭的 Think 开关；需要再次确认。', label:fullLabel(exactThinkControl) };
    }
  }

  const debug = controls.slice(0, 32).map(el => {
    const label = fullLabel(el);
    const id = el.getAttribute('data-testid') || '';
    const aria = el.getAttribute('aria-haspopup') || '';
    return [label, id ? 'testid=' + id : '', aria ? 'haspopup=' + aria : ''].filter(Boolean).join(' | ');
  }).filter(Boolean);
  return { status:menuRoots.length ? 'menu_without_think' : 'not_found',
    detail:menuRoots.length ? '检测到菜单已展开，但其中没有识别到 Thinking 选项。' : '没有找到明确的模型选择器或 Think 控件。',
    debug };
})()`;

const FOCUS_EDITOR_SCRIPT = `(() => {
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const selectors = ['#prompt-textarea','[data-testid="prompt-textarea"]','textarea[placeholder]','[contenteditable="true"]'];
  for (const selector of selectors) {
    const el = [...document.querySelectorAll(selector)].find(item => visible(item) && !item.disabled && item.getAttribute('aria-disabled') !== 'true');
    if (el) { el.focus(); return { found:true, tag:el.tagName, selector }; }
  }
  return { found:false };
})()`;

const CLICK_SEND_SCRIPT = `(() => {
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const disabled = el => el.disabled || el.getAttribute('aria-disabled') === 'true';
  const direct = document.querySelector('button[data-testid="send-button"]');
  if (direct && visible(direct) && !disabled(direct)) { direct.click(); return { clicked:true, method:'send-button-testid' }; }
  const buttons = [...document.querySelectorAll('button,[role="button"]')].filter(el => {
    if (!visible(el) || disabled(el)) return false;
    const label = [el.getAttribute('aria-label'),el.getAttribute('data-testid'),el.getAttribute('title'),el.innerText].filter(Boolean).join(' ').toLowerCase();
    return /(send|发送|提交)/i.test(label) && !/(stop|cancel|停止|取消)/i.test(label);
  });
  if (buttons.length) { buttons[0].click(); return { clicked:true, method:'accessible-send-button' }; }
  return { clicked:false, method:'enter-fallback' };
})()`;

async function inspectPage(wc) {
  try {
    const state = await wc.executeJavaScript(PAGE_STATE_SCRIPT);
    
    return state;
  } catch (error) {
    const href = wc.getURL(); let isConversationRoute = false;
    try { isConversationRoute = new URL(href).pathname.includes('/c/'); } catch {}
    const state = { error: error.message || String(error), href, isConversationRoute, hasComposer:false };
    
    return state;
  }
}

async function ensureSidebarExpanded(wc, run) {
  try {
    const result = await wc.executeJavaScript(ENSURE_SIDEBAR_SCRIPT);
    
    if (result?.status === 'opened') {
      emitProgress('侧边栏', `检测到侧边栏已折叠，已尝试展开（${result.label || '展开按钮'}）。`, 'info', run.cycle);
      await sleep(1200);
    } else if (result?.status === 'already_open' || result?.status === 'probably_open') {
      emitProgress('侧边栏', '侧边栏当前已展开，不重复点击。', 'success', run.cycle);
    } else {
      emitProgress('侧边栏', result?.label || '无法确定侧边栏状态；继续执行。', 'warning', run.cycle);
    }
  } catch (error) {
    emitProgress('侧边栏', `检查侧边栏时发生异常：${error.message || error}；继续执行。`, 'warning', run.cycle);
  }
}

async function navigateToFreshChat(wc, run) {
  emitProgress('新建对话', `第 ${run.cycle} 轮：导航到 ChatGPT 新对话入口。`, 'info', run.cycle);
  try {
    const nav = wc.loadURL(CHATGPT_HOME);
    void nav.catch(error => emitProgress('新建对话提示', `导航提示：${error.message || error}`, 'warning', run.cycle));
  } catch (error) {
    emitProgress('新建对话提示', `启动新对话导航失败：${error.message || error}`, 'warning', run.cycle);
  }

  await waitFor(run, NEW_CHAT_DELAY_MS, '新对话页面加载');
  let state = await inspectPage(wc);

  // The root URL should represent a blank/new chat. If the page is still on an
  // old /c/<id> conversation or the composer is absent, navigate to the root
  // once more (not to another conversation) and give it another 30 seconds.
  if (state?.isConversationRoute || !state?.hasComposer) {
    emitProgress('新建对话重试', `首次检查未确认新对话（${state?.isConversationRoute ? '仍处于旧会话 URL' : '未找到输入框'}）；重新导航到首页一次，不沿用旧对话。`, 'warning', run.cycle);
    try {
      const nav = wc.loadURL(CHATGPT_HOME);
      void nav.catch(error => emitProgress('新建对话提示', `二次导航提示：${error.message || error}`, 'warning', run.cycle));
    } catch (error) {
      emitProgress('新建对话提示', `二次导航失败：${error.message || error}`, 'warning', run.cycle);
    }
    await waitFor(run, NEW_CHAT_DELAY_MS, '新对话二次加载');
    state = await inspectPage(wc);
  }

  const fresh = !!state && !state.isConversationRoute && state.hasComposer;
  if (!fresh) {
    const current = state?.href || wc.getURL() || '未知地址';
    emitProgress('新对话未就绪', `无法确认已经进入空白新对话或未找到输入框（${current}）。本轮跳过 Think、粘贴和提交，45 分钟后继续下一轮，避免误发到旧对话。`, 'warning', run.cycle);
    return false;
  }
  emitProgress('新对话已就绪', `已确认处于新对话入口，输入框可用；视口 ${state.viewportWidth || '?'}×${state.viewportHeight || '?'}，DPR ${state.devicePixelRatio || '?'}；页面地址：${state.href}`, 'success', run.cycle);
  await ensureSidebarExpanded(wc, run);
  return true;
}

async function runThinkInspection(wc, run) {
  let result;
  try {
    result = await wc.executeJavaScript(THINK_INSPECT_AND_SELECT_SCRIPT);
    
  } catch (error) {
    return { ok:false, status:'script_error', detail:`读取页面控件失败：${error.message || error}` };
  }

  if (result?.status === 'confirmed') return { ok:true, detail:result.detail || 'Think 已确认。' };
  if (['choice_clicked', 'toggle_clicked', 'picker_opened'].includes(result?.status)) {
    emitProgress('Think 操作', `${result.detail || '已触发 Think 控件操作。'} 控件：${result.label || '未提供'}`, 'info', run.cycle);
    await sleep(1600);
    try {
      const verify = await wc.executeJavaScript(THINK_INSPECT_AND_SELECT_SCRIPT);
      
      if (verify?.status === 'confirmed') return { ok:true, detail:verify.detail || 'Think 已确认。' };
      if (verify?.status === 'choice_clicked' || verify?.status === 'toggle_clicked') {
        return { ok:false, status:verify.status, detail:'已经执行一次选择操作，但页面仍未明确显示 Thinking 已选中。' };
      }
      return { ok:false, status:verify?.status || 'not_found', detail:verify?.detail || '操作后仍未确认 Think 状态。', debug:verify?.debug };
    } catch (error) {
      return { ok:false, status:'verify_error', detail:`操作后复查失败：${error.message || error}` };
    }
  }
  return { ok:false, status:result?.status || 'not_found', detail:result?.detail || '没有识别到 Think 控件。', debug:result?.debug };
}

async function tryEnableThinking(wc, run) {
  if (!scheduler.thinkingEnabled) {
    emitProgress('思考模式', '已关闭自动设置 Think；沿用当前 ChatGPT 模式。', 'info', run.cycle);
    return;
  }

  emitProgress('思考模式', '开始设置本轮 Think：最多尝试 3 次；第 1 次失败后刷新当前新对话一次，之后不再刷新。', 'info', run.cycle);
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    throwIfCancelled(run);
    emitProgress('Think 尝试', `第 ${attempt}/3 次：检查模型菜单及 Thinking 选项。`, 'info', run.cycle);
    last = await runThinkInspection(wc, run);
    if (last.ok) {
      emitProgress('思考模式已确认', `${last.detail}（第 ${attempt}/3 次）`, 'success', run.cycle);
      return;
    }
    const debugText = Array.isArray(last.debug) && last.debug.length ? ` 页面控件样本：${last.debug.slice(0, 14).join(' || ')}` : '';
    emitProgress('Think 未定位', `第 ${attempt}/3 次未能确认 Thinking：${last.detail || last.status || '未知原因'}。${debugText}`, 'warning', run.cycle);

    if (attempt === 1) {
      emitProgress('刷新当前对话', 'Think 第一次定位失败：刷新当前空白新对话页面，不创建额外对话。', 'info', run.cycle);
      try { wc.reload(); } catch (error) {
        emitProgress('刷新当前对话', `刷新动作异常：${error.message || error}；仍等待后继续第二次尝试。`, 'warning', run.cycle);
      }
      await waitFor(run, THINK_RETRY_DELAY_MS, '刷新当前对话后');
      const state = await inspectPage(wc);
      if (state?.isConversationRoute) {
        emitProgress('Think 页面提示', '刷新后 URL 显示为已有会话路径；不再创建新会话，继续执行 Think 定位尝试。', 'warning', run.cycle);
      }
      await ensureSidebarExpanded(wc, run);
    } else if (attempt === 2) {
      await waitFor(run, THINK_RETRY_DELAY_MS, 'Think 第二次失败后');
    }
  }

  emitProgress('思考模式跳过', '连续 3 次仍无法确认 Think；按要求不再刷新、不暂停，继续后续粘贴和提交步骤。', 'warning', run.cycle);
}

async function pastePrompt(wc, prompt, run) {
  throwIfCancelled(run);
  const focus = await wc.executeJavaScript(FOCUS_EDITOR_SCRIPT).catch(error => ({ found:false, error:error.message || String(error) }));
  
  if (!focus?.found) {
    emitProgress('粘贴跳过', '当前页面没有找到可见的 ChatGPT 输入框，为防止粘贴到错误页面，本轮跳过粘贴和提交。', 'warning', run.cycle);
    return false;
  }
  clipboard.writeText(prompt);
  wc.focus();
  wc.sendInputEvent({ type:'keyDown', keyCode:'V', modifiers:['control'] });
  wc.sendInputEvent({ type:'keyUp', keyCode:'V', modifiers:['control'] });
  emitProgress('粘贴提示词', `已向 ChatGPT 输入框发送 Ctrl+V 粘贴动作（${prompt.length} 个字符）；不核验文本内容。`, 'success', run.cycle);
  return true;
}

async function triggerSubmit(wc, run) {
  throwIfCancelled(run);
  let result = null;
  try { result = await wc.executeJavaScript(CLICK_SEND_SCRIPT); } catch (error) { result = { error:error.message || String(error) }; }
  
  if (result?.clicked) {
    emitProgress('提交动作', `已触发发送按钮（${result.method}）。按要求不检测服务器是否接收，也不检测 GPT 是否开始生成。`, 'success', run.cycle);
    return;
  }
  wc.focus();
  wc.sendInputEvent({ type:'keyDown', keyCode:'ENTER' });
  wc.sendInputEvent({ type:'keyUp', keyCode:'ENTER' });
  
  emitProgress('提交动作', '未找到可识别的发送按钮，已发送 Enter 备用提交动作。不检测提交结果。', 'warning', run.cycle);
}

async function executeCycle() {
  if (!scheduler.running) return;
  const run = { cancelled:false, cycle:++scheduler.cycle };
  totalCycles += 1;
  saveStats();
  scheduler.activeRun = run;
  const wc = view?.webContents;
  let freshChatReady = false;
  let submitAttempted = false;

  try {
    if (wc && !wc.isDestroyed()) {
      freshChatReady = await navigateToFreshChat(wc, run);
    } else {
      emitProgress('新建对话提示', '内置浏览器当前不可用；本轮跳过发送，仍按计划安排下一轮。', 'warning', run.cycle);
    }

    if (freshChatReady && wc && !wc.isDestroyed()) {
      await tryEnableThinking(wc, run);
      await waitStep(run, 'Think 设置步骤结束后');

      emitProgress('粘贴提示词', `开始粘贴固定提示词（${scheduler.prompt.length} 个字符）。`, 'info', run.cycle);
      let pasted = false;
      try { pasted = await pastePrompt(wc, scheduler.prompt, run); }
      catch (error) {
        if (error.code === 'RUN_CANCELLED') throw error;
        emitProgress('粘贴提示词', `粘贴动作异常：${error.message || error}；本轮跳过提交。`, 'warning', run.cycle);
      }

      await waitStep(run, '提示词粘贴后');
      if (pasted && wc && !wc.isDestroyed()) {
        submitAttempted = true;
        await captureAssistantResponseBaseline(wc, run);
        emitProgress('提交动作', '开始触发提交。', 'info', run.cycle);
        try { await triggerSubmit(wc, run); }
        catch (error) {
          if (error.code === 'RUN_CANCELLED') throw error;
          emitProgress('提交动作', `发送操作异常：${error.message || error}。不核验结果，仍按计划等待下一轮。`, 'warning', run.cycle);
        }
      } else {
        emitProgress('提交跳过', '本轮没有确认完成输入框聚焦，因此未触发发送；仍按设定等待窗口继续下一轮。', 'warning', run.cycle);
      }
    }
  } catch (error) {
    if (error.code === 'RUN_CANCELLED') {
      if (scheduler.activeRun === run) scheduler.activeRun = null;
      emitProgress('已停止', '当前轮次被用户停止。', 'warning', run.cycle);
      return;
    }
    emitProgress('本轮异常', `${error.message || error}；不会因本轮异常自动暂停，仍安排下一轮。`, 'warning', run.cycle);
  }

  if (!scheduler.running || run.cancelled) {
    if (scheduler.activeRun === run) scheduler.activeRun = null;
    return;
  }

  scheduler.nextRunAt = Date.now() + scheduler.intervalMs;
  const minutes = Math.round(scheduler.intervalMs / 60000);
  emitProgress('等待下一轮', `本轮操作结束。最长人工等待 ${minutes} 分钟；GitHub main 每 90 秒检查（新提交静默满 ${Math.round(githubQuietThresholdMs / 60_000)} 分钟提前轮换）；助手新回复出现“${assistantCompletionMarker || '（已关闭）'}”且生成结束后提前轮换；主内容区域红字/红框提示连续确认 5 秒（包括滚动区域内的提示）。`, 'success', run.cycle);

  let waitResult = { reason:'interval-elapsed' };
  try {
    waitResult = await waitForNextCycleWindow(
      run,
      wc && !wc.isDestroyed() ? wc : null,
      scheduler.intervalMs,
      { checkConversationLimit:submitAttempted, checkAssistantCompletion:submitAttempted }
    );
  } catch (error) {
    if (error.code === 'RUN_CANCELLED') {
      if (scheduler.activeRun === run) scheduler.activeRun = null;
      return;
    }
    // A fault in the optional wait watcher must not cancel or shorten the configured wait.
    
    const elapsed = Date.now() - (scheduler.nextRunAt - scheduler.intervalMs);
    const remaining = Math.max(0, scheduler.intervalMs - elapsed);
    if (remaining > 0 && scheduler.running && !run.cancelled) {
      try { await waitFor(run, remaining, '长度检测器异常，回退到原定等待', '固定等待'); }
      catch (waitError) {
        if (waitError.code !== 'RUN_CANCELLED') emitProgress('等待回退失败', `等待回退时发生异常：${waitError.message || waitError}。`, 'warning', run.cycle);
      }
    }
    waitResult = { reason:run.cancelled || !scheduler.running ? 'stopped' : 'interval-elapsed', detectorFailed:true };
  }
  if (scheduler.activeRun === run) scheduler.activeRun = null;
  if (!scheduler.running || run.cancelled || waitResult.reason === 'stopped') return;

  scheduler.nextRunAt = null;
  scheduler.timer = null;
  if (waitResult.reason === 'assistant-completion-marker') {
    emitProgress('提前轮换', `第 ${run.cycle} 轮已回显结束标记“${waitResult.evidence?.marker || assistantCompletionMarker}”，助手回复完成，立即开始第 ${scheduler.cycle + 1} 轮。`, 'success', run.cycle, { earlyRotation:true, trigger:'assistant-completion-marker' });
  } else if (waitResult.reason === 'conversation-limit') {
    emitProgress('提前轮换', `第 ${run.cycle} 轮对话已达到长度上限，不再等待剩余时间，立即开始第 ${scheduler.cycle + 1} 轮。`, 'success', run.cycle, { earlyRotation:true });
  } else if (waitResult.reason === 'github-quiet') {
    emitProgress('提前轮换', `本次运行期间出现的 GitHub main 新提交已连续静默满 ${Math.round(githubQuietThresholdMs / 60_000)} 分钟，立即开始第 ${scheduler.cycle + 1} 轮。`, 'success', run.cycle, { earlyRotation:true, trigger:'github-quiet' });
  } else {
    emitProgress('等待结束', `最长人工等待时间已到，开始第 ${scheduler.cycle + 1} 轮。`, 'success', run.cycle);
  }
  void executeCycle();
}

function stopScheduler(reason = '用户停止') {
  scheduler.running = false;
  scheduler.nextRunAt = null;
  if (scheduler.timer) clearTimeout(scheduler.timer);
  scheduler.timer = null;
  if (scheduler.activeRun) scheduler.activeRun.cancelled = true;
  emitProgress('已停止', `${reason}；后续轮换已停止。`, 'warning', scheduler.cycle);
}

ipcMain.handle('browser:proxy', async (_event, cfg) => {
  await applyProxy(cfg);
  return { ok:true };
});

ipcMain.handle('browser:reload', async () => {
  if (view) await view.webContents.loadURL(CHATGPT_HOME);
  return { ok:true };
});

ipcMain.handle('automation:start', async (_event, options) => {
  if (scheduler.running) return { ok:false, reason:'自动轮换已经在运行。' };
  const prompt = typeof options?.prompt === 'string' ? options.prompt.trim() : '';
  if (!prompt) return { ok:false, reason:'固定提示词不能为空。' };
  const intervalMs = Number(options?.intervalMs);
  scheduler.prompt = prompt;
  scheduler.thinkingEnabled = options?.thinkingEnabled !== false;
  scheduler.intervalMs = Number.isFinite(intervalMs) && intervalMs >= 60_000
    ? Math.min(intervalMs, 24 * 60 * 60_000)
    : DEFAULT_CYCLE_DELAY_MS;
  scheduler.cycle = 0;
  scheduler.githubMonitorState = createGithubMonitorState();
  scheduler.githubBaselinePending = true;
  scheduler.lastGithubCommit = null;
  scheduler.pendingGithubRotation = null;
  scheduler.running = true;
  scheduler.nextRunAt = null;
  emitProgress('启动运行', `0.1.14 固定流程：新建对话→等待30秒→展开侧边栏→Think最多3次（第一次失败刷新当前对话，等待30秒；第二次失败等待30秒；仍失败继续）→等待20秒→粘贴→等待20秒→提交→最长人工等待${Math.round(scheduler.intervalMs / 60000)}分钟（GitHub main 每90秒检查，本次运行新提交静默满${Math.round(githubQuietThresholdMs / 60_000)}分钟可提前轮换；主内容区域红字/红框提示（包括滚动区）连续5秒确认后提前轮换；助手新回复回显“${assistantCompletionMarker || '（已关闭）'}”且生成完成后提前轮换）。`, 'success', 0);
  void primeGithubMonitorBaseline(scheduler.githubMonitorState);
  void executeCycle();
  return { ok:true };
});

ipcMain.handle('automation:stop', async () => {
  stopScheduler('用户点击停止');
  return { ok:true };
});

ipcMain.handle('settings:github-quiet-threshold', async (_event, minutes) => updateGithubQuietThreshold(minutes));
ipcMain.handle('settings:assistant-completion-marker', async (_event, marker) => updateAssistantCompletionMarker(marker));

ipcMain.handle('browser:status', async () => ({
  url: view ? view.webContents.getURL() : '',
  loading: view ? view.webContents.isLoading() : false,
  proxy: proxyConfig,
  automationRunning: scheduler.running,
  cycle: scheduler.cycle,
  totalCycles,
  nextRunAt: scheduler.nextRunAt,
  githubQuietThresholdMinutes: Math.round(githubQuietThresholdMs / 60_000),
  assistantCompletionMarker
}));

app.whenReady().then(() => {
  loadStats();
  loadSettings();
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
