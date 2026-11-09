'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REPOSITORY,
  GITHUB_ACTIONS_RUNS_API,
  createGithubActionsRunsApi,
  GITHUB_ACTIONS_STARTUP_POLL_INTERVAL_MS,
  extractActiveMainWorkflowRuns,
  fetchActiveMainWorkflowRuns,
  waitForMainActionsToFinish
} = require('../src/github-actions-gate.cjs');

function response(status, payload) {
  return { ok:status >= 200 && status < 300, status, json:async () => payload };
}
const active = (id, status='in_progress', branch='main') => ({
  id, name:'Build Toolchain', status, head_branch:branch, head_sha:'0123456789abcdef',
  display_title:'this must never be copied into logs'
});

test('queries the monitored public repository main branch with a bounded active-run list', () => {
  assert.equal(REPOSITORY, '${target}');
  assert.match(GITHUB_ACTIONS_RUNS_API, /actions\/runs\?branch=main&per_page=100$/);
  assert.equal(createGithubActionsRunsApi('https://github.com/${target}/commits/main/'), GITHUB_ACTIONS_RUNS_API);
  assert.throws(() => createGithubActionsRunsApi('not a repo'), /GitHub 仓库/);
  assert.equal(GITHUB_ACTIONS_STARTUP_POLL_INTERVAL_MS, 60_000);
});

test('startup Actions checks follow the user-selected repository', async () => {
  let calledUrl = '';
  await fetchActiveMainWorkflowRuns({
    repository:'https://github.com/Arlene206/padavan-4.4-2/commits/main/',
    fetchImpl:async url => { calledUrl=url; return response(200,{workflow_runs:[]}); }
  });
  assert.equal(calledUrl,'https://api.github.com/repos/Arlene206/padavan-4.4-2/actions/runs?branch=main&per_page=100');
});

test('only main-branch queued or active workflow runs enter the startup gate', () => {
  const runs = extractActiveMainWorkflowRuns({ workflow_runs:[
    active(1, 'in_progress'), active(2, 'queued'), active(3, 'waiting'),
    active(4, 'pending'), active(5, 'requested'), active(6, 'completed'),
    active(7, 'in_progress', 'feature/test')
  ]});
  assert.deepEqual(runs.map(run => run.id), [1,2,3,4,5]);
  assert.ok(runs.every(run => run.status !== 'completed'));
  assert.ok(runs.every(run => !Object.hasOwn(run, 'display_title')));
  assert.throws(() => extractActiveMainWorkflowRuns({ workflow_runs:null }), /工作流列表无效/);
});

test('uses a Token when available but retries anonymously when the PAT lacks Actions permission', async () => {
  const calls = [];
  const runs = await fetchActiveMainWorkflowRuns({
    token:'github_pat_dummy',
    fetchImpl:async (url, init) => {
      calls.push({url, headers:init.headers});
      if (calls.length === 1) return response(403, {});
      return response(200, { workflow_runs:[active(8, 'queued')] });
    }
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, GITHUB_ACTIONS_RUNS_API);
  assert.equal(calls[0].headers.Authorization, 'Bearer github_pat_dummy');
  assert.equal(Object.hasOwn(calls[1].headers, 'Authorization'), false);
  assert.deepEqual(runs.map(run => run.id), [8]);
});

test('Token permission fallback shares one request-time budget and stops at its deadline', async () => {
  let calls = 0;
  await assert.rejects(fetchActiveMainWorkflowRuns({
    token:'github_pat_dummy',
    timeoutMs:5,
    fetchImpl:async () => {
      calls += 1;
      await new Promise(resolve => setTimeout(resolve, 12));
      return response(403, {});
    }
  }), /请求超时/);
  assert.equal(calls, 1, 'an exhausted request budget must not start a second anonymous request');
});

test('startup gate proceeds immediately when there are no active Actions', async () => {
  let checks = 0;
  const result = await waitForMainActionsToFinish({
    timeoutMs:60_000,
    checkActiveRuns:async () => { checks += 1; return []; }
  });
  assert.equal(result.status, 'clear');
  assert.equal(checks, 1);
  assert.equal(result.checks, 1);
});

test('a late successful API response cannot clear a gate or emit a false success event', async () => {
  let clock = 0;
  const events = [];
  const result = await waitForMainActionsToFinish({
    timeoutMs:100,
    now:() => clock,
    sleepImpl:async ms => { clock += ms; },
    onCheck:event => events.push(event),
    checkActiveRuns:async () => {
      clock = 150;
      return [];
    }
  });
  assert.equal(result.status, 'timeout');
  assert.equal(result.elapsedMs, 150);
  assert.equal(events.some(event => event.ok === true), false);
});

test('startup gate waits for Actions to finish and then releases', async () => {
  let clock = 0, checks = 0;
  const sleeps = [];
  const result = await waitForMainActionsToFinish({
    timeoutMs:5_000, pollIntervalMs:1_000, now:() => clock,
    sleepImpl:async ms => { sleeps.push(ms); clock += ms; },
    checkActiveRuns:async () => {
      checks += 1;
      return checks === 1 ? [{id:90,name:'Build Toolchain',status:'in_progress',headSha:'abcdef0'}] : [];
    }
  });
  assert.equal(result.status, 'clear');
  assert.equal(checks, 2);
  assert.equal(result.checks, 2);
  assert.ok(sleeps.length > 0);
});

test('startup gate has a hard deadline when a workflow never finishes', async () => {
  let clock = 0, checks = 0;
  const result = await waitForMainActionsToFinish({
    timeoutMs:1_000, pollIntervalMs:400, now:() => clock,
    sleepImpl:async ms => { clock += ms; },
    checkActiveRuns:async () => { checks += 1; return [{id:91,name:'Build Toolchain',status:'in_progress',headSha:'abcdef0'}]; }
  });
  assert.equal(result.status, 'timeout');
  assert.equal(result.activeRuns.length, 1);
  assert.equal(result.elapsedMs, 1_000);
  assert.ok(checks <= 4, 'polling should remain bounded');
});

test('startup gate times out when Actions requests continually fail', async () => {
  let clock = 0, checks = 0;
  const result = await waitForMainActionsToFinish({
    timeoutMs:1_000, pollIntervalMs:500, now:() => clock,
    sleepImpl:async ms => { clock += ms; },
    checkActiveRuns:async () => { checks += 1; throw new Error('API unavailable'); }
  });
  assert.equal(result.status, 'timeout');
  assert.equal(result.lastError, 'API unavailable');
  assert.equal(result.activeRuns.length, 0);
  assert.ok(checks <= 3, 'API failures must not create an infinite loop');
});

test('stopping during the delay cancels the startup gate', async () => {
  let clock = 0, cancelled = false, checks = 0;
  const result = await waitForMainActionsToFinish({
    timeoutMs:10_000, pollIntervalMs:5_000, now:() => clock,
    sleepImpl:async ms => { clock += ms; cancelled = true; },
    isCancelled:() => cancelled,
    checkActiveRuns:async () => { checks += 1; return [{id:92,name:'Build Toolchain',status:'queued',headSha:'abcdef0'}]; }
  });
  assert.equal(result.status, 'cancelled');
  assert.equal(checks, 1);
});
