'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src', 'main.cjs'), 'utf8');

test('GitHub Token save and clear responses use the status contract consumed by the UI', () => {
  const saveStart = main.indexOf('async function updateGithubToken(value)');
  const clearStart = main.indexOf('function removeGithubToken()');
  const settingsEnd = main.indexOf('function saveStats()');
  assert.ok(saveStart >= 0 && clearStart > saveStart && settingsEnd > clearStart);

  const saveHandler = main.slice(saveStart, clearStart);
  const clearHandler = main.slice(clearStart, settingsEnd);
  assert.match(saveHandler, /githubTokenConfigured:\s*true/);
  assert.match(saveHandler, /githubTokenRejected:\s*false/);
  assert.match(saveHandler, /githubPollIntervalSeconds:/);
  assert.match(clearHandler, /githubTokenConfigured:\s*false/);
  assert.match(clearHandler, /githubTokenRejected:\s*false/);
  assert.match(clearHandler, /githubPollIntervalSeconds:/);

  assert.match(renderer, /status\.githubTokenConfigured === true \|\| status\.configured === true/);
  assert.match(renderer, /status\.githubTokenRejected === true \|\| status\.rejected === true/);
  assert.match(renderer, /syncGithubAuthControls\(result\)/);
});

test('successful unchanged GitHub polls emit a safe heartbeat with SHA age and auth mode', () => {
  const start = main.indexOf("if (observation.status === 'unchanged')");
  const end = main.indexOf("\n        if (observation.status === 'baseline')", start);
  assert.ok(start >= 0 && end > start, 'unchanged-result branch should exist');
  const block = main.slice(start, end);

  assert.match(block, /emitProgress\(\s*'GitHub轮询检查'/);
  assert.match(block, /commit\.sha\.slice\(0, 7\)/);
  assert.match(block, /Math\.floor\(commit\.ageMs \/ 60_000\)/);
  assert.match(block, /hasAuthenticatedGithubToken\(\)/);
  assert.match(block, /静默阈值/);
  assert.doesNotMatch(block, /commit\.(?:message|body)|payload/);
});
