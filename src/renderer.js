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
    log('启动请求已接受', `新对话等待30秒；Think最多3次；人工最长等待${minutes}分钟；GitHub main 每90秒检测，新提交静默达到${$('githubQuietThreshold').value}分钟提前轮换；助手回显“${$('assistantCompletionMarker').value || '已关闭'}”且生成结束即提前轮换；主内容区含滚动区域的红字/红框连续5秒确认后提前轮换。`, 'event-ok');
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

log('程序就绪', '0.1.12：轻量模式；支持助手新回复结束标记（默认“结束任务简报”）与生成完成检测；红字/红框扫描覆盖主内容区全部滚动位置，连续确认5秒；GitHub静默阈值可配置。不会保存网页回复正文或采集API正文。');
