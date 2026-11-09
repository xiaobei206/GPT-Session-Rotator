'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_GITHUB_REPOSITORY,
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
  fetchLatestCommit,
  createGithubMonitorState,
  observeGithubCommit
} = require('../src/github-monitor.cjs');

function response({ status = 200, date, payload } = {}) {
  return {
    ok:status >= 200 && status < 300,
    status,
    headers:{ get:name => name.toLowerCase() === 'date' ? date : null },
    json:async () => payload
  };
}

function commit(sha, ageMs) { return { sha, ageMs }; }

test('normalizes repository slugs and GitHub URLs including commits/main links', () => {
  assert.equal(DEFAULT_GITHUB_REPOSITORY, 'Arlene206/padavan-4.4-2');
  for (const value of ['Arlene206/padavan-4.4-2', 'https://github.com/Arlene206/padavan-4.4-2', 'https://github.com/Arlene206/padavan-4.4-2/commits/main/', 'github.com/Arlene206/padavan-4.4-2/commits/main', 'Arlene206/padavan-4.4-2.git']) {
    assert.equal(normalizeGithubRepository(value), 'Arlene206/padavan-4.4-2', value);
  }
  for (const value of ['', 'owner', 'https://example.com/owner/repo', 'https://github.com/owner', 'owner/repo name', '../repo', null]) {
    assert.equal(normalizeGithubRepository(value), null, String(value));
  }
  assert.equal(createGithubCommitApiUrl('Arlene206/padavan-4.4-2'), 'https://api.github.com/repos/Arlene206/padavan-4.4-2/commits/main');
  assert.throws(() => createGithubCommitApiUrl('not a repo'), /GitHub 仓库/);
});

test('the latest-commit API follows the selected repository', async () => {
  let calledUrl = '';
  const result = await fetchLatestCommit({
    repository:'https://github.com/Arlene206/padavan-4.4-2/commits/main/',
    fetchImpl:async url => {
      calledUrl = url;
      return response({ date:'Mon, 09 Nov 2026 02:00:00 GMT', payload:{
        sha:'selected-repo-sha',
        html_url:'https://github.com/Arlene206/padavan-4.4-2/commit/selected-repo-sha',
        commit:{ committer:{ date:'2026-11-09T01:59:00Z' } }
      }});
    }
  });
  assert.equal(calledUrl, 'https://api.github.com/repos/Arlene206/padavan-4.4-2/commits/main');
  assert.equal(result.repository, 'Arlene206/padavan-4.4-2');
});

test('30-second polling requires authentication; unauthenticated options remain 90/120/150/180 seconds', () => {
  assert.equal(GITHUB_POLL_INTERVAL_MS, 90_000);
  assert.equal(GITHUB_DEFAULT_POLL_INTERVAL_SECONDS, 90);
  assert.deepEqual(GITHUB_POLL_INTERVAL_OPTIONS_SECONDS, [30, 90, 120, 150, 180]);
  assert.deepEqual(GITHUB_UNAUTHENTICATED_POLL_INTERVAL_OPTIONS_SECONDS, [90, 120, 150, 180]);
  assert.equal(normalizeGithubPollIntervalSeconds(30), null);
  assert.equal(normalizeGithubPollIntervalSeconds(30, { authenticated:true }), 30);
  for (const value of [90, 120, 150, 180, '90', '120']) assert.equal(normalizeGithubPollIntervalSeconds(value), Number(value));
  for (const value of [0, 30, 60, 89, 100, 181, 300, 90.5, 'abc', null]) assert.equal(normalizeGithubPollIntervalSeconds(value), null, String(value));
  assert.equal(GITHUB_DEFAULT_QUIET_THRESHOLD_MS, 15 * 60_000);
});

test('quiet threshold accepts only whole minutes from 1 through 180', () => {
  assert.equal(GITHUB_MIN_QUIET_THRESHOLD_MINUTES, 1);
  assert.equal(GITHUB_MAX_QUIET_THRESHOLD_MINUTES, 180);
  assert.equal(normalizeGithubQuietThresholdMinutes('15'), 15);
  assert.equal(normalizeGithubQuietThresholdMinutes(1), 1);
  assert.equal(normalizeGithubQuietThresholdMinutes(180), 180);
  for (const value of [0, -1, 181, 1.5, 'abc', null]) {
    assert.equal(normalizeGithubQuietThresholdMinutes(value), null, String(value));
  }
});

test('fetches main commit and computes age from GitHub Date, not local clock', async () => {
  const serverTime = 'Fri, 06 Nov 2026 12:00:00 GMT';
  const commitTime = '2026-11-06T11:54:00Z';
  let calledUrl = '';
  const result = await fetchLatestCommit({
    fetchImpl:async (url, init) => {
      calledUrl = url;
      assert.equal(init.cache, 'no-store');
      assert.equal(init.headers['X-GitHub-Api-Version'], '2022-11-28');
      return response({ date:serverTime, payload:{
        sha:'abcdef0123456789',
        html_url:'https://github.com/xiaobei206/padavan-4.4-2/commit/abcdef0',
        commit:{ committer:{ date:commitTime } }
      }});
    }
  });
  assert.equal(calledUrl, GITHUB_COMMIT_API);
  assert.equal(result.ageMs, 360_000);
  assert.equal(result.serverTimeMs, Date.parse(serverTime));
  assert.equal(result.sha, 'abcdef0123456789');
});

test('adds a Bearer header only when an optional token is provided', async () => {
  let authenticatedInit;
  await fetchLatestCommit({
    token:'github_pat_test_secret_value_123456',
    fetchImpl:async (_url, init) => {
      authenticatedInit = init;
      return response({ date:'Fri, 06 Nov 2026 12:00:00 GMT', payload:{
        sha:'secure-sha',
        commit:{ committer:{ date:'2026-11-06T11:59:00Z' } }
      }});
    }
  });
  assert.equal(authenticatedInit.headers.Authorization, 'Bearer github_pat_test_secret_value_123456');

  let publicInit;
  await fetchLatestCommit({
    fetchImpl:async (_url, init) => {
      publicInit = init;
      return response({ date:'Fri, 06 Nov 2026 12:00:00 GMT', payload:{
        sha:'public-sha',
        commit:{ committer:{ date:'2026-11-06T11:59:00Z' } }
      }});
    }
  });
  assert.equal(Object.hasOwn(publicInit.headers, 'Authorization'), false);
});

test('refuses to use local time if GitHub Date header is missing', async () => {
  await assert.rejects(
    fetchLatestCommit({ fetchImpl:async () => response({ payload:{ sha:'abc', commit:{ committer:{ date:'2026-11-06T11:00:00Z' } } } }) }),
    /Date 响应头/
  );
});

test('non-success HTTP status is a non-triggering request failure', async () => {
  await assert.rejects(fetchLatestCommit({ fetchImpl:async () => response({ status:403 }) }), /HTTP 403/);
});

test('old commit present at startup becomes baseline and must not immediately rotate', () => {
  const state = createGithubMonitorState();
  const first = observeGithubCommit(state, commit('old-sha', 24 * 60 * 60_000));
  assert.equal(first.status, 'baseline');
  assert.equal(first.shouldRotate, false);
  assert.equal(state.baselineSha, 'old-sha');
  assert.equal(observeGithubCommit(state, commit('old-sha', 24 * 60 * 60_000)).shouldRotate, false);
});

test('only a commit that appears after startup baseline can trigger after the configured quiet threshold', () => {
  const state = createGithubMonitorState();
  assert.equal(observeGithubCommit(state, commit('baseline', 90 * 60_000)).shouldRotate, false);
  const newCommit = observeGithubCommit(state, commit('new-sha', 90_000));
  assert.equal(newCommit.status, 'new-commit');
  assert.equal(newCommit.shouldRotate, false);
  assert.equal(observeGithubCommit(state, commit('new-sha', GITHUB_DEFAULT_QUIET_THRESHOLD_MS - 1)).shouldRotate, false);
  const reached = observeGithubCommit(state, commit('new-sha', GITHUB_DEFAULT_QUIET_THRESHOLD_MS));
  assert.equal(reached.status, 'quiet-threshold-reached');
  assert.equal(reached.shouldRotate, true);
  assert.equal(observeGithubCommit(state, commit('new-sha', 20 * 60_000)).shouldRotate, false);
});

test('newer commit resets the candidate; returning to baseline clears candidate', () => {
  const state = createGithubMonitorState();
  observeGithubCommit(state, commit('baseline', 60 * 60_000));
  assert.equal(observeGithubCommit(state, commit('new-a', 5 * 60_000)).status, 'new-commit');
  assert.equal(observeGithubCommit(state, commit('new-b', 5 * 60_000)).status, 'new-commit');
  assert.equal(observeGithubCommit(state, commit('new-b', GITHUB_DEFAULT_QUIET_THRESHOLD_MS - 1)).shouldRotate, false);
  assert.equal(observeGithubCommit(state, commit('new-b', GITHUB_DEFAULT_QUIET_THRESHOLD_MS)).shouldRotate, true);
  assert.equal(observeGithubCommit(state, commit('baseline', 90 * 60_000)).status, 'baseline-restored');
  assert.equal(observeGithubCommit(state, commit('baseline', 90 * 60_000)).shouldRotate, false);
});

test('a malformed commit never initializes or triggers the monitor', () => {
  const state = createGithubMonitorState();
  assert.equal(observeGithubCommit(state, {sha:'', ageMs:999999}).status, 'invalid');
  assert.equal(state.initialized, false);
});


test('changing the quiet threshold re-evaluates the current candidate immediately', () => {
  const state = createGithubMonitorState();
  observeGithubCommit(state, commit('baseline', 60 * 60_000));
  assert.equal(observeGithubCommit(state, commit('new-sha', 8 * 60_000), 15 * 60_000).shouldRotate, false);
  const updated = observeGithubCommit(state, commit('new-sha', 8 * 60_000), 7 * 60_000);
  assert.equal(updated.status, 'quiet-threshold-reached');
  assert.equal(updated.shouldRotate, true);
});
