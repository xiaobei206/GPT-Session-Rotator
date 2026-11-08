const $ = id => document.getElementById(id);
const promptBox = $('prompt'), logBody = $('logBody');
let running = false, runCycle = 0, totalCycles = 0, nextAt = null, logs = [];

function timestamp(d = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function counterText() {
  $('sessionCount').textContent = `本次 ${runCycle} 轮 · 累计 ${totalCycles} 轮`;
}
function log(event, detail, kind='', number=null) {
  const item = {time:timestamp(), number: number ?? (runCycle ? `#${runCycle} / ${totalCycles}` : '—'), event, detail};
  logs.unshift(item); if (logs.length > 3000) logs.pop();
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.number)}</td><td class="${kind}">${escapeHtml(event)}</td><td>${escapeHtml(detail)}</td>`;
  logBody.prepend(tr);
}
function setStatus(text, active=running) { $('statusText').textContent=text; $('statusDot').classList.toggle('running',active); }
function intervalMs() {
  const custom = Number($('customInterval').value);
  const mins = custom > 0 ? Math.min(1440, custom) : Number($('interval').value);
  return mins * 60000;
}
function updateNext() { $('nextRun').textContent = nextAt ? `下次循环：${timestamp(new Date(nextAt))}` : '下次循环：—'; }
function setRunning(value) {
  running = value;
  $('startBtn').disabled = value;
  $('stopBtn').disabled = !value;
}
function syncGithubAuthControls(status = {}) {
  const configured = status.githubTokenConfigured === true || status.configured === true;
  const rejected = status.githubTokenRejected === true || status.rejected === true;
  const fastOption = $('githubPollInterval').querySelector('option[value="30"]');
  if (fastOption) fastOption.disabled = !configured || rejected;
  $('clearGithubTokenBtn').disabled = !configured;
  $('githubTokenStatus').textContent = rejected
    ? '已保存，但认证失败'
    : configured ? '已加密保存' : '未设置';
  if ((!configured || rejected) && $('githubPollInterval').value === '30') {
    $('githubPollInterval').value = String(status.githubPollIntervalSeconds || 90);
  }
}
function progress(payload) {
  if (!payload?.message) return;
  if (Number.isInteger(payload.cycle)) runCycle = payload.cycle;
  if (Number.isInteger(payload.totalCycles)) totalCycles = payload.totalCycles;
  counterText();
  if (payload.nextRunAt) nextAt = payload.nextRunAt;
  else if (payload.event === '新建对话' || payload.event === '启动运行' || payload.event === '已停止') nextAt = null;
  updateNext();
  const kind = payload.level === 'warning' ? 'event-warn' : payload.level === 'success' ? 'event-ok' : '';
  const number = payload.cycle ? `#${payload.cycle} / ${payload.totalCycles ?? totalCycles}` : '—';
  if (payload.event === 'GitHub Token 认证失败') {
    window.rotator.getStatus().then(syncGithubAuthControls).catch(() => {});
  }
  log(payload.event || '运行进度', payload.message, kind, number);
  if (payload.event === '启动运行') {
    setRunning(true);
    setStatus('运行中', true);
  } else if (payload.event === '等待下一轮') {
    setStatus('等待下一轮', true);
  } else if (payload.event === '已停止') {
    setRunning(false);
    setStatus('已停止', false);
  } else if (running) {
    setStatus(payload.message.slice(0, 24), true);
  }
}
window.rotator.onProgress(progress);

$('promptJumpBtn').addEventListener('click', () => {
  promptBox.scrollIntoView({ behavior:'smooth', block:'center' });
  promptBox.focus({ preventScroll:true });
});

$('startBtn').addEventListener('click', async () => {
  if (running) return;
  const prompt = promptBox.value.trim();
  if (!prompt) { log('无法开始', '请先填写固定提示词。', 'event-warn'); promptBox.focus(); return; }
  const minutes = Math.round(intervalMs() / 60000);
  setRunning(true);
  setStatus('正在启动…', true);
  try {
    const result = await window.rotator.startLoop({
      prompt,
      thinkingEnabled: $('thinkingEnabled').checked,
      intervalMs: intervalMs()
    });
    if (!result?.ok) {
      setRunning(false);
      setStatus('启动失败', false);
      log('启动失败', result?.reason || '后台未能启动轮换。', 'event-error');
      return;
    }
    log('启动请求已接受', `新对话等待30秒；Think最多3次；人工最长等待${minutes}分钟；GitHub main 每${$('githubPollInterval').value}秒检测，新提交静默达到${$('githubQuietThreshold').value}分钟提前轮换；助手回显“${$('assistantCompletionMarker').value || '已关闭'}”且生成结束即提前轮换；主内容区含滚动区域的红字/红框连续5秒确认后提前轮换。`, 'event-ok');
  } catch (error) {
    setRunning(false);
    setStatus('启动失败', false);
    log('启动异常', error.message || String(error), 'event-error');
  }
});

$('stopBtn').addEventListener('click', async () => {
  try { await window.rotator.stopLoop(); }
  catch (error) { log('停止异常', error.message || String(error), 'event-error'); }
  setRunning(false);
  nextAt = null; updateNext();
  setStatus('已停止', false);
  log('停止请求', '已停止当前步骤等待和后续轮换；已经发出的 ChatGPT 请求不会被撤回。', 'event-warn');
});

$('reloadBtn').addEventListener('click', async () => {
  try { await window.rotator.reloadBrowser(); log('刷新浏览器', '已请求重新打开 ChatGPT。'); }
  catch(error) { log('刷新失败', error.message || String(error), 'event-error'); }
});

$('githubPollInterval').addEventListener('change', async () => {
  const requestedSeconds = Number($('githubPollInterval').value);
  try {
    const result = await window.rotator.setGithubPollIntervalSeconds(requestedSeconds);
    if (!result?.ok) throw new Error(result?.reason || '设置未能保存。');
    $('githubPollInterval').value = String(result.seconds);
    if (!result.persisted) log('GitHub 轮询间隔未能持久化', '当前进程内已应用，但设置文件写入失败；重启后将恢复上次保存值。', 'event-warn');
  } catch (error) {
    const status = await window.rotator.getStatus().catch(() => null);
    if ([30,90,120,150,180].includes(status?.githubPollIntervalSeconds)) $('githubPollInterval').value = String(status.githubPollIntervalSeconds);
    if (status) syncGithubAuthControls(status);
    log('GitHub 轮询间隔设置失败', error.message || String(error), 'event-error');
  }
});

$('githubQuietThreshold').addEventListener('change', async () => {
  const requestedMinutes = Number($('githubQuietThreshold').value);
  try {
    const result = await window.rotator.setGithubQuietThreshold(requestedMinutes);
    if (!result?.ok) throw new Error(result?.reason || '设置未能保存。');
    $('githubQuietThreshold').value = String(result.minutes);
    if (!result.persisted) log('GitHub阈值未能持久化', '本次进程内已应用，但设置文件写入失败；重启后将恢复为上次保存值。', 'event-warn');
  } catch (error) {
    const status = await window.rotator.getStatus().catch(() => null);
    if (Number.isInteger(status?.githubQuietThresholdMinutes)) {
      $('githubQuietThreshold').value = String(status.githubQuietThresholdMinutes);
    }
    log('GitHub阈值设置失败', error.message || String(error), 'event-error');
  }
});

$('saveGithubTokenBtn').addEventListener('click', async () => {
  const token = $('githubToken').value;
  if (!token.trim()) {
    log('GitHub Token 未填写', '请粘贴 Token 后再保存；留空不会更改当前凭据。', 'event-warn');
    return;
  }
  try {
    const result = await window.rotator.setGithubToken(token);
    if (!result?.ok) throw new Error(result?.reason || 'Token 未能安全保存。');
    $('githubToken').value = '';
    syncGithubAuthControls(result);
    log('GitHub Token 已安全保存', 'Token 已加密保存在本机；可选择 30 秒轮询。密钥内容不会显示或写入日志。', 'event-ok');
  } catch (error) {
    $('githubToken').value = '';
    log('GitHub Token 保存失败', error.message || String(error), 'event-error');
  }
});

$('clearGithubTokenBtn').addEventListener('click', async () => {
  try {
    const result = await window.rotator.clearGithubToken();
    if (!result?.ok) throw new Error(result?.reason || 'Token 未能清除。');
    $('githubToken').value = '';
    syncGithubAuthControls(result);
    $('githubPollInterval').value = '90';
    log('GitHub Token 已清除', '已恢复未认证模式，轮询间隔至少为 90 秒。', 'event-warn');
  } catch (error) {
    log('GitHub Token 清除失败', error.message || String(error), 'event-error');
  }
});

$('assistantCompletionMarker').addEventListener('change', async () => {
  const requestedMarker = $('assistantCompletionMarker').value;
  try {
    const result = await window.rotator.setAssistantCompletionMarker(requestedMarker);
    if (!result?.ok) throw new Error(result?.reason || '设置未能保存。');
    $('assistantCompletionMarker').value = result.marker;
    if (!result.persisted) log('结束回显标记未持久化', '本次运行内已应用，但设置文件写入失败；重启后将恢复上次保存值。', 'event-warn');
  } catch (error) {
    const status = await window.rotator.getStatus().catch(() => null);
    if (typeof status?.assistantCompletionMarker === 'string') $('assistantCompletionMarker').value = status.assistantCompletionMarker;
    log('结束回显标记设置失败', error.message || String(error), 'event-error');
  }
});

$('applyProxyBtn').addEventListener('click', async () => {
  const cfg = {enabled:$('proxyEnabled').checked,type:$('proxyType').value,host:$('proxyHost').value.trim(),port:$('proxyPort').value.trim()};
  try {
    await window.rotator.applyProxy(cfg);
    log('代理配置已应用', cfg.enabled ? `${cfg.type.toUpperCase()} ${cfg.host}:${cfg.port}` : '已关闭代理，使用直连。', 'event-ok');
  } catch(error) { log('代理配置失败', error.message || String(error), 'event-error'); }
});

$('clearLogs').addEventListener('click', () => { logs=[]; logBody.replaceChildren(); log('清空日志', '日志列表已清空。'); });
$('exportLogs').addEventListener('click', () => {
  const content = ['时间\t本次/累计\t事件\t详情', ...logs.slice().reverse().map(x=>[x.time,x.number,x.event,x.detail].join('\t'))].join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+content],{type:'text/tab-separated-values;charset=utf-8'}));
  a.download=`GPT-Session-Rotator-${new Date().toISOString().replace(/[:.]/g,'-')}.tsv`; a.click(); URL.revokeObjectURL(a.href);
});

window.rotator.getStatus().then(status => {
  if (status) {
    if (Number.isInteger(status.githubQuietThresholdMinutes)) $('githubQuietThreshold').value = String(status.githubQuietThresholdMinutes);
    if ([30,90,120,150,180].includes(status.githubPollIntervalSeconds)) $('githubPollInterval').value = String(status.githubPollIntervalSeconds);
    syncGithubAuthControls(status);
    if (typeof status.assistantCompletionMarker === 'string') $('assistantCompletionMarker').value = status.assistantCompletionMarker;
    runCycle = Number(status.cycle || 0);
    totalCycles = Number(status.totalCycles || 0);
    counterText();
  }
  if (status?.automationRunning) {
    setRunning(true);
    nextAt = status.nextRunAt || null;
    updateNext();
    setStatus('运行中', true);
  }
}).catch(() => {});

log('程序就绪', `0.2.3：轻量模式；GitHub API 查询间隔可选 ${$('githubPollInterval').value} 秒；配置 Token 可开放 30 秒档，运行中即时生效；GitHub 静默阈值可配置。助手新回复结束标记（默认“结束任务简报”）需生成完成并稳定确认；红字/红框扫描覆盖主内容区全部滚动位置，连续确认5秒。不会保存网页回复正文或采集API正文。`);
