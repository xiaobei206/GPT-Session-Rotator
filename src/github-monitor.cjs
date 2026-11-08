'use strict';

const REPOSITORY = 'xiaobei206/padavan-4.4-2';
const GITHUB_COMMIT_API = `https://api.github.com/repos/${REPOSITORY}/commits/main`;
const GITHUB_DEFAULT_POLL_INTERVAL_SECONDS = 90;
const GITHUB_POLL_INTERVAL_OPTIONS_SECONDS = Object.freeze([90, 120, 150, 180]);
const GITHUB_POLL_INTERVAL_MS = GITHUB_DEFAULT_POLL_INTERVAL_SECONDS * 1000;
const GITHUB_DEFAULT_QUIET_THRESHOLD_MS = 15 * 60_000;
const GITHUB_MIN_QUIET_THRESHOLD_MINUTES = 1;
const GITHUB_MAX_QUIET_THRESHOLD_MINUTES = 180;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Fetch the current main-branch head and calculate commit age using GitHub's
 * HTTP Date header. This deliberately never falls back to the local machine clock.
 */
async function fetchLatestCommit({ fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('当前运行环境不支持 fetch。');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('GitHub API 请求超时。')), timeoutMs);
  try {
    const response = await fetchImpl(GITHUB_COMMIT_API, {
      method:'GET',
      cache:'no-store',
      headers:{
        Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28',
        'User-Agent':'GPT-Session-Rotator/0.1.12',
        'Cache-Control':'no-cache',
        Pragma:'no-cache'
      },
      signal:controller.signal
    });

    if (!response?.ok) {
      const status = response?.status ?? 'unknown';
      const error = new Error(`GitHub API 返回 HTTP ${status}。`);
      error.status = response?.status;
      throw error;
    }

    const serverDateHeader = response.headers?.get?.('date');
    const serverTimeMs = Date.parse(serverDateHeader || '');
    if (!Number.isFinite(serverTimeMs)) {
      throw new Error('GitHub API 未提供有效的 Date 响应头，已跳过本次静默判断。');
    }

    const payload = await response.json();
    const sha = typeof payload?.sha === 'string' ? payload.sha : '';
    const committerDate = payload?.commit?.committer?.date || payload?.commit?.author?.date;
    const commitTimeMs = Date.parse(committerDate || '');
    if (!sha || !Number.isFinite(commitTimeMs)) {
      throw new Error('GitHub API 返回的最新提交缺少有效 SHA 或提交时间。');
    }

    return {
      sha,
      committerDate,
      serverTimeMs,
      ageMs:Math.max(0, serverTimeMs - commitTimeMs),
      htmlUrl:typeof payload.html_url === 'string' ? payload.html_url : ''
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Create per-automation-run state. The repository head present at startup is
 * a baseline, not a candidate for early rotation. Only a SHA observed after
 * that baseline can become eligible for the configurable quiet-time rule.
 */
function createGithubMonitorState() {
  return {
    initialized:false,
    baselineSha:null,
    lastSeenSha:null,
    candidateSha:null,
    triggeredShas:new Set()
  };
}

/**
 * Feed one successful API result into the monitor.
 *
 * First observation establishes the baseline and NEVER rotates, regardless
 * of how old that commit is. A later head change starts a candidate. That
 * candidate can rotate once its GitHub-server-calculated age reaches the
 * configured threshold.
 */
function observeGithubCommit(state, commit, thresholdMs = GITHUB_DEFAULT_QUIET_THRESHOLD_MS) {
  if (!state || !(state.triggeredShas instanceof Set)) {
    throw new TypeError('Invalid GitHub monitor state.');
  }
  if (!commit || typeof commit.sha !== 'string' || !commit.sha || !Number.isFinite(commit.ageMs)) {
    return { status:'invalid', shouldRotate:false };
  }

  if (!state.initialized) {
    state.initialized = true;
    state.baselineSha = commit.sha;
    state.lastSeenSha = commit.sha;
    state.candidateSha = null;
    return { status:'baseline', shouldRotate:false, sha:commit.sha };
  }

  let status = 'unchanged';
  if (state.lastSeenSha !== commit.sha) {
    state.lastSeenSha = commit.sha;
    state.candidateSha = commit.sha === state.baselineSha ? null : commit.sha;
    status = state.candidateSha ? 'new-commit' : 'baseline-restored';
  }

  if (!state.candidateSha || state.candidateSha !== commit.sha) {
    return { status, shouldRotate:false, sha:commit.sha };
  }

  if (commit.ageMs < thresholdMs || state.triggeredShas.has(commit.sha)) {
    return { status, shouldRotate:false, sha:commit.sha };
  }

  state.triggeredShas.add(commit.sha);
  return { status:'quiet-threshold-reached', shouldRotate:true, sha:commit.sha };
}

function normalizeGithubPollIntervalSeconds(value) {
  const seconds = Number(value);
  return GITHUB_POLL_INTERVAL_OPTIONS_SECONDS.includes(seconds) ? seconds : null;
}

function normalizeGithubQuietThresholdMinutes(value) {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < GITHUB_MIN_QUIET_THRESHOLD_MINUTES || minutes > GITHUB_MAX_QUIET_THRESHOLD_MINUTES) {
    return null;
  }
  return minutes;
}

module.exports = {
  REPOSITORY,
  GITHUB_COMMIT_API,
  GITHUB_POLL_INTERVAL_MS,
  GITHUB_DEFAULT_POLL_INTERVAL_SECONDS,
  GITHUB_POLL_INTERVAL_OPTIONS_SECONDS,
  normalizeGithubPollIntervalSeconds,
  GITHUB_DEFAULT_QUIET_THRESHOLD_MS,
  GITHUB_MIN_QUIET_THRESHOLD_MINUTES,
  GITHUB_MAX_QUIET_THRESHOLD_MINUTES,
  normalizeGithubQuietThresholdMinutes,
  REQUEST_TIMEOUT_MS,
  fetchLatestCommit,
  createGithubMonitorState,
  observeGithubCommit
};
