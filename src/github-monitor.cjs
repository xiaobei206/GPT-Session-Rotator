'use strict';

const DEFAULT_GITHUB_REPOSITORY = 'Arlene206/padavan-4.4-2';
const REPOSITORY = DEFAULT_GITHUB_REPOSITORY;
const GITHUB_COMMIT_API = `https://api.github.com/repos/${DEFAULT_GITHUB_REPOSITORY}/commits/main`;

function normalizeGithubRepository(value) {
  if (typeof value !== 'string') return null;
  let input = value.trim();
  if (!input || input.length > 2048) return null;
  let pathname;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    let parsed;
    try { parsed = new URL(input); } catch { return null; }
    if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase()) || parsed.username || parsed.password) return null;
    pathname = parsed.pathname;
  } else {
    if (input.toLowerCase().startsWith('www.github.com/')) input = input.slice(4);
    if (input.toLowerCase().startsWith('github.com/')) input = input.slice('github.com/'.length);
    pathname = '/' + input.replace(/^\/+/, '');
  }
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  let repository = parts[1];
  if (repository.toLowerCase().endsWith('.git')) repository = repository.slice(0, -4);
  const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
  const repositoryPattern = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/;
  if (owner.length > 39 || repository.length > 100 || !ownerPattern.test(owner) || !repositoryPattern.test(repository) || repository === '.' || repository === '..') return null;
  return `${owner}/${repository}`;
}
function createGithubCommitApiUrl(repository = DEFAULT_GITHUB_REPOSITORY) {
  const normalized = normalizeGithubRepository(repository);
  if (!normalized) throw new RangeError('GitHub 仓库必须是 owner/repo 或 GitHub 仓库 URL。');
  return `https://api.github.com/repos/${normalized}/commits/main`;
}
const GITHUB_DEFAULT_POLL_INTERVAL_SECONDS = 90;
const GITHUB_POLL_INTERVAL_OPTIONS_SECONDS = Object.freeze([30, 90, 120, 150, 180]);
const GITHUB_UNAUTHENTICATED_POLL_INTERVAL_OPTIONS_SECONDS = Object.freeze([90, 120, 150, 180]);
const GITHUB_POLL_INTERVAL_MS = GITHUB_DEFAULT_POLL_INTERVAL_SECONDS * 1000;
const GITHUB_DEFAULT_QUIET_THRESHOLD_MS = 15 * 60_000;
const GITHUB_MIN_QUIET_THRESHOLD_MINUTES = 1;
const GITHUB_MAX_QUIET_THRESHOLD_MINUTES = 180;
const REQUEST_TIMEOUT_MS = 15_000;

function normalizeGithubPollIntervalSeconds(value, { authenticated = false } = {}) {
  const seconds = Number(value);
  if (seconds === 30) return authenticated ? 30 : null;
  return GITHUB_UNAUTHENTICATED_POLL_INTERVAL_OPTIONS_SECONDS.includes(seconds) ? seconds : null;
}

/**
 * Fetch the current main-branch head and calculate age using GitHub's Date
 * response header. The optional token is supplied only by the main process.
 */
async function fetchLatestCommit({ fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS, token = '', repository = DEFAULT_GITHUB_REPOSITORY } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('当前运行环境不支持 fetch。');
  const apiUrl = createGithubCommitApiUrl(repository);
  const normalizedRepository = normalizeGithubRepository(repository);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('GitHub API 请求超时。')), timeoutMs);
  try {
    const headers = {
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'GPT-Session-Rotator/0.2.4',
      'Cache-Control':'no-cache',
      Pragma:'no-cache'
    };
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    if (normalizedToken) {
      if (/\s/.test(normalizedToken)) throw new Error('GitHub Token 格式无效。');
      headers.Authorization = `Bearer ${normalizedToken}`;
    }

    const response = await fetchImpl(apiUrl, {
      method:'GET',
      cache:'no-store',
      headers,
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
      htmlUrl:typeof payload.html_url === 'string' ? payload.html_url : '',
      repository:normalizedRepository
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createGithubMonitorState() {
  return {
    initialized:false,
    baselineSha:null,
    lastSeenSha:null,
    candidateSha:null,
    triggeredShas:new Set()
  };
}

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

function normalizeGithubQuietThresholdMinutes(value) {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < GITHUB_MIN_QUIET_THRESHOLD_MINUTES || minutes > GITHUB_MAX_QUIET_THRESHOLD_MINUTES) {
    return null;
  }
  return minutes;
}

module.exports = {
  DEFAULT_GITHUB_REPOSITORY,
  REPOSITORY,
  GITHUB_COMMIT_API,
  normalizeGithubRepository,
  createGithubCommitApiUrl,
  GITHUB_POLL_INTERVAL_MS,
  GITHUB_DEFAULT_POLL_INTERVAL_SECONDS,
  GITHUB_POLL_INTERVAL_OPTIONS_SECONDS,
  GITHUB_UNAUTHENTICATED_POLL_INTERVAL_OPTIONS_SECONDS,
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
