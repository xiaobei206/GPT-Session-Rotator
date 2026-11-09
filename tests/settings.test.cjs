'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES,
  DEFAULT_GITHUB_POLL_INTERVAL_SECONDS,
  loadGithubRepository,
  saveGithubRepository,
  loadGithubPollIntervalSeconds,
  saveGithubPollIntervalSeconds,
  loadGithubToken,
  saveGithubToken,
  clearGithubToken,
  loadGithubQuietThresholdMinutes,
  saveGithubQuietThresholdMinutes,
  DEFAULT_ASSISTANT_COMPLETION_MARKER,
  loadAssistantCompletionMarker,
  saveAssistantCompletionMarker
} = require('../src/settings.cjs');

test('missing or invalid settings use the 15-minute default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-rotator-settings-'));
  const file = path.join(dir, 'settings.json');
  try {
    assert.equal(DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES, 15);
    assert.equal(loadGithubQuietThresholdMinutes(file), 15);
    assert.equal(DEFAULT_GITHUB_POLL_INTERVAL_SECONDS, 90);
    assert.equal(loadGithubRepository(file), 'Arlene206/padavan-4.4-2');
    assert.equal(loadGithubPollIntervalSeconds(file), 90);
    assert.equal(DEFAULT_ASSISTANT_COMPLETION_MARKER, '结束任务简报');
    assert.equal(loadAssistantCompletionMarker(file), '结束任务简报');
    fs.writeFileSync(file, JSON.stringify({ githubQuietThresholdMinutes:999, githubPollIntervalSeconds:105, githubRepository:'https://example.com/not-a-repo' }), 'utf8');
    assert.equal(loadGithubRepository(file), 'Arlene206/padavan-4.4-2');
    assert.equal(loadGithubQuietThresholdMinutes(file), 15);
    assert.equal(loadGithubPollIntervalSeconds(file), 90);
    fs.writeFileSync(file, JSON.stringify({ githubPollIntervalSeconds:30 }), 'utf8');
    assert.equal(loadGithubPollIntervalSeconds(file), 90);
    assert.equal(loadGithubPollIntervalSeconds(file, { authenticated:true }), 30);
    fs.writeFileSync(file, '{invalid json', 'utf8');
    assert.equal(loadGithubQuietThresholdMinutes(file), 15);
  } finally {
    fs.rmSync(dir, { recursive:true, force:true });
  }
});

test('quiet threshold persists and is restored from settings.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-rotator-settings-'));
  const file = path.join(dir, 'settings.json');
  try {
    assert.equal(saveGithubQuietThresholdMinutes(file, 27), 27);
    assert.equal(saveGithubRepository(file, 'https://github.com/Arlene206/padavan-4.4-2/commits/main/'), 'Arlene206/padavan-4.4-2');
    assert.equal(loadGithubRepository(file), 'Arlene206/padavan-4.4-2');
    assert.equal(loadGithubQuietThresholdMinutes(file), 27);
    assert.equal(saveGithubPollIntervalSeconds(file, 120), 120);
    assert.equal(loadGithubPollIntervalSeconds(file), 120);
    assert.throws(() => saveGithubPollIntervalSeconds(file, 30), /token is required/i);
    assert.equal(saveGithubPollIntervalSeconds(file, 30, { authenticated:true }), 30);
    assert.equal(loadGithubPollIntervalSeconds(file, { authenticated:true }), 30);
    assert.equal(saveGithubPollIntervalSeconds(file, 120), 120);
    assert.equal(saveAssistantCompletionMarker(file, '任务完成'), '任务完成');
    assert.equal(loadAssistantCompletionMarker(file), '任务完成');
    assert.equal(saveGithubQuietThresholdMinutes(file, 45), 45);
    assert.equal(loadGithubQuietThresholdMinutes(file), 45);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(data.schemaVersion, 2);
    assert.equal(data.githubQuietThresholdMinutes, 45);
    assert.equal(data.githubPollIntervalSeconds, 120);
    assert.equal(data.assistantCompletionMarker, '任务完成');
    assert.ok(data.updatedAt);
  } finally {
    fs.rmSync(dir, { recursive:true, force:true });
  }
});

test('invalid values are rejected instead of silently persisted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-rotator-settings-'));
  const file = path.join(dir, 'settings.json');
  try {
    assert.throws(() => saveGithubRepository(file, 'https://example.com/owner/repo'), /GitHub 仓库/);
    assert.throws(() => saveGithubQuietThresholdMinutes(file, 0), /1 to 180/);
    assert.throws(() => saveGithubQuietThresholdMinutes(file, 181), /1 to 180/);
    assert.throws(() => saveGithubQuietThresholdMinutes(file, 3.5), /1 to 180/);
    assert.throws(() => saveGithubPollIntervalSeconds(file, 89), /90, 120, 150, or 180/);
    assert.throws(() => saveGithubPollIntervalSeconds(file, 105), /90, 120, 150, or 180/);
    assert.throws(() => saveGithubPollIntervalSeconds(file, 180.5), /90, 120, 150, or 180/);
    assert.throws(() => saveAssistantCompletionMarker(file, '标记'.repeat(60)), /100 characters/);
    assert.equal(fs.existsSync(file), false);
  } finally {
    fs.rmSync(dir, { recursive:true, force:true });
  }
});


test('GitHub Token is encrypted through safeStorage and never persisted in plaintext', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-rotator-token-'));
  const file = path.join(dir, 'settings.json');
  const token = 'github_pat_test_secret_value_123456';
  // Reversible fake for testing safeStorage plumbing only; production uses Electron/Windows DPAPI.
  const safeStorage = {
    isAsyncEncryptionAvailable:async () => true,
    encryptStringAsync:async value => Buffer.from([...value].reverse().join(''), 'utf8'),
    decryptStringAsync:async bytes => ({
      result:[...Buffer.from(bytes).toString('utf8')].reverse().join(''),
      shouldReEncrypt:false
    })
  };
  try {
    assert.equal(await saveGithubToken(file, token, safeStorage), true);
    const stored = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(stored, new RegExp(token));
    assert.match(stored, /githubTokenEncrypted/);
    assert.equal(await loadGithubToken(file, safeStorage), token);
    assert.equal(clearGithubToken(file), true);
    assert.equal(await loadGithubToken(file, safeStorage), '');
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).githubTokenEncrypted, null);
  } finally {
    fs.rmSync(dir, { recursive:true, force:true });
  }
});

test('GitHub Token is not persisted when OS encryption is unavailable', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-rotator-token-unavailable-'));
  const file = path.join(dir, 'settings.json');
  const safeStorage = {
    isAsyncEncryptionAvailable:async () => false
  };
  try {
    await assert.rejects(saveGithubToken(file, 'github_pat_test_secret_123456789', safeStorage), /安全存储不可用/);
    assert.equal(fs.existsSync(file), false);
  } finally {
    fs.rmSync(dir, { recursive:true, force:true });
  }
});


test('GitHub Token supports the Electron 39 synchronous safeStorage DPAPI API', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-rotator-token-electron39-'));
  const file = path.join(dir, 'settings.json');
  const token = 'github_pat_electron39_compat_test_123';
  const safeStorage = {
    isEncryptionAvailable:() => true,
    encryptString:value => Buffer.from([...value].reverse().join(''), 'utf8'),
    decryptString:bytes => [...Buffer.from(bytes).toString('utf8')].reverse().join('')
  };
  try {
    assert.equal(await saveGithubToken(file, token, safeStorage), true);
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.doesNotMatch(JSON.stringify(saved), new RegExp(token));
    assert.equal(await loadGithubToken(file, safeStorage), token);
    assert.equal(clearGithubToken(file), true);
    assert.equal(await loadGithubToken(file, safeStorage), '');
  } finally {
    fs.rmSync(dir, { recursive:true, force:true });
  }
});
