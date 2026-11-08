'use strict';

const REPOSITORY = 'xiaobei206/padavan-4.4-2';
const GITHUB_ACTIONS_RUNS_API = `https://api.github.com/repos/${REPOSITORY}/actions/runs?branch=main&per_page=100`;
const GITHUB_ACTIONS_STARTUP_POLL_INTERVAL_MS = 60_000;
const GITHUB_ACTIONS_REQUEST_TIMEOUT_MS = 15_000;
const ACTIVE_WORKFLOW_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

function extractActiveMainWorkflowRuns(payload) {
  if (!payload || !Array.isArray(payload.workflow_runs)) {
    throw new TypeError('GitHub Actions API 返回的工作流列表无效。');
  }
  return payload.workflow_runs
    .filter(run => run && run.head_branch === 'main' &&
      ACTIVE_WORKFLOW_STATUSES.has(String(run.status || '').toLowerCase()))
    .map(run => ({
      id:typeof run.id === 'number' || typeof run.id === 'string' ? run.id : 'unknown',
      name:typeof run.name === 'string' && run.name.trim()
        ? run.name.replace(/[\r\n\t]/g, ' ').trim().slice(0, 80)
        : '未命名工作流',
      status:String(run.status).toLowerCase(),
      headSha:typeof run.head_sha === 'string' ? run.head_sha : ''
    }));
}

async function fetchActiveMainWorkflowRuns({
  fetchImpl = globalThis.fetch,
  token = '',
  timeoutMs = GITHUB_ACTIONS_REQUEST_TIMEOUT_MS
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('当前运行环境不支持 fetch。');
  const normalizedToken = typeof token === 'string' ? token.trim() : '';
  const requestTimeoutMs = Math.max(1, Number.isFinite(Number(timeoutMs))
    ? Number(timeoutMs) : GITHUB_ACTIONS_REQUEST_TIMEOUT_MS);
  // The authenticated request and any anonymous permission fallback share one
  // deadline; a fallback must not add a second full timeout to startup.
  const requestDeadline = Date.now() + requestTimeoutMs;

  async function request(authToken) {
    const remainingMs = requestDeadline - Date.now();
    if (remainingMs <= 0) throw new Error('GitHub Actions API 请求超时。');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('GitHub Actions API 请求超时。')), remainingMs);
    try {
      const headers = {
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
        'User-Agent':'GPT-Session-Rotator/0.2.3',
        'Cache-Control':'no-cache',
        Pragma:'no-cache'
      };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      let response;
      try {
        response = await fetchImpl(GITHUB_ACTIONS_RUNS_API, {
          method:'GET', cache:'no-store', headers, signal:controller.signal
        });
      } catch (error) {
        if (controller.signal.aborted) throw new Error('GitHub Actions API 请求超时。');
        throw error;
      }
      if (!response?.ok) {
        const status = response?.status ?? 'unknown';
        const error = new Error(`GitHub Actions API 返回 HTTP ${status}。`);
        error.status = response?.status;
        throw error;
      }
      return extractActiveMainWorkflowRuns(await response.json());
    } finally {
      clearTimeout(timeout);
    }
  }

  if (normalizedToken) {
    try {
      return await request(normalizedToken);
    } catch (error) {
      // Fine-grained PATs may grant Contents: Read but not Actions: Read.
      // The monitored repository is public, so retry anonymously without invalidating the Token.
      if (![401, 403, 404].includes(error?.status)) throw error;
      if (requestDeadline - Date.now() <= 0) throw new Error('GitHub Actions API 请求超时。');
      return request('');
    }
  }
  return request('');
}

async function waitForMainActionsToFinish({
  checkActiveRuns,
  timeoutMs,
  pollIntervalMs = GITHUB_ACTIONS_STARTUP_POLL_INTERVAL_MS,
  requestTimeoutMs = GITHUB_ACTIONS_REQUEST_TIMEOUT_MS,
  isCancelled = () => false,
  onCheck = () => {},
  now = Date.now,
  sleepImpl = ms => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
  if (typeof checkActiveRuns !== 'function') throw new TypeError('checkActiveRuns must be a function.');
  if (typeof isCancelled !== 'function') throw new TypeError('isCancelled must be a function.');
  if (typeof onCheck !== 'function') throw new TypeError('onCheck must be a function.');
  if (typeof now !== 'function' || typeof sleepImpl !== 'function') throw new TypeError('Clock and sleep dependencies must be functions.');

  const startAt = now();
  const maxWaitMs = Number.isFinite(Number(timeoutMs)) ? Math.max(0, Number(timeoutMs)) : 0;
  const intervalMs = Number.isFinite(Number(pollIntervalMs)) && Number(pollIntervalMs) > 0
    ? Number(pollIntervalMs) : GITHUB_ACTIONS_STARTUP_POLL_INTERVAL_MS;
  const requestLimitMs = Number.isFinite(Number(requestTimeoutMs)) && Number(requestTimeoutMs) > 0
    ? Number(requestTimeoutMs) : GITHUB_ACTIONS_REQUEST_TIMEOUT_MS;
  const deadline = startAt + maxWaitMs;
  let checks = 0, lastActiveRuns = [], lastError = null;

  const snapshot = () => ({
    checks, activeRuns:lastActiveRuns, lastError,
    elapsedMs:Math.max(0, now() - startAt),
    remainingMs:Math.max(0, deadline - now())
  });
  const notify = data => { try { onCheck({ ...snapshot(), ...data }); } catch {} };
  const cancelledResult = () => ({ status:'cancelled', ...snapshot() });
  const timeoutResult = () => ({ status:'timeout', ...snapshot() });

  while (true) {
    if (isCancelled()) return cancelledResult();
    const remainingBeforeRequest = deadline - now();
    if (remainingBeforeRequest <= 0) return timeoutResult();
    try {
      const runs = await checkActiveRuns(Math.max(1, Math.min(requestLimitMs, remainingBeforeRequest)));
      if (!Array.isArray(runs)) throw new TypeError('GitHub Actions 检查没有返回有效的工作流列表。');
      lastActiveRuns = runs;
      lastError = null;
      checks += 1;
      notify({ ok:true });
      // A late response must not turn an already-expired gate into success.
      if (now() >= deadline) return timeoutResult();
      if (runs.length === 0) return { status:'clear', ...snapshot() };
    } catch (error) {
      lastError = String(error?.message || error || '未知错误').slice(0, 200);
      checks += 1;
      notify({ ok:false, error:lastError });
    }
    if (isCancelled()) return cancelledResult();
    const remainingAfterRequest = deadline - now();
    if (remainingAfterRequest <= 0) return timeoutResult();
    const sleepUntil = now() + Math.min(intervalMs, remainingAfterRequest);
    while (now() < sleepUntil) {
      if (isCancelled()) return cancelledResult();
      const pauseMs = Math.min(250, sleepUntil - now());
      if (pauseMs > 0) await sleepImpl(pauseMs);
    }
  }
}

module.exports = {
  REPOSITORY, GITHUB_ACTIONS_RUNS_API, GITHUB_ACTIONS_STARTUP_POLL_INTERVAL_MS,
  GITHUB_ACTIONS_REQUEST_TIMEOUT_MS, ACTIVE_WORKFLOW_STATUSES,
  extractActiveMainWorkflowRuns, fetchActiveMainWorkflowRuns, waitForMainActionsToFinish
};
