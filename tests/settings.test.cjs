'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES,
  DEFAULT_GITHUB_POLL_INTERVAL_SECONDS,
  loadGithubPollIntervalSeconds,
  saveGithubPollIntervalSeconds,
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
    assert.equal(loadGithubPollIntervalSeconds(file), 90);
    assert.equal(DEFAULT_ASSISTANT_COMPLETION_MARKER, '结束任务简报');
    assert.equal(loadAssistantCompletionMarker(file), '结束任务简报');
    fs.writeFileSync(file, JSON.stringify({ githubQuietThresholdMinutes:999, githubPollIntervalSeconds:105 }), 'utf8');
    assert.equal(loadGithubQuietThresholdMinutes(file), 15);
    assert.equal(loadGithubPollIntervalSeconds(file), 90);
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
    assert.equal(loadGithubQuietThresholdMinutes(file), 27);
    assert.equal(saveGithubPollIntervalSeconds(file, 120), 120);
    assert.equal(loadGithubPollIntervalSeconds(file), 120);
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
