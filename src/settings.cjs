'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  GITHUB_DEFAULT_QUIET_THRESHOLD_MS,
  GITHUB_DEFAULT_POLL_INTERVAL_SECONDS,
  normalizeGithubPollIntervalSeconds,
  normalizeGithubQuietThresholdMinutes
} = require('./github-monitor.cjs');
const { DEFAULT_ASSISTANT_COMPLETION_MARKER, normalizeAssistantCompletionMarker } = require('./assistant-completion.cjs');

const DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES = GITHUB_DEFAULT_QUIET_THRESHOLD_MS / 60_000;
const DEFAULT_GITHUB_POLL_INTERVAL_SECONDS = GITHUB_DEFAULT_POLL_INTERVAL_SECONDS;

function readSettings(settingsPath) {
  try {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeSettings(settingsPath, patch) {
  if (typeof settingsPath !== 'string' || !settingsPath.trim()) {
    throw new TypeError('Settings file path is required.');
  }
  const directory = path.dirname(settingsPath);
  const temporaryPath = `${settingsPath}.tmp`;
  const previous = readSettings(settingsPath);
  const next = { ...previous, ...patch, schemaVersion:2, updatedAt:new Date().toISOString() };
  fs.mkdirSync(directory, { recursive:true });
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(next, null, 2), 'utf8');
    fs.renameSync(temporaryPath, settingsPath);
  } catch (error) {
    try { fs.rmSync(temporaryPath, { force:true }); } catch {}
    throw error;
  }
  return next;
}

function loadGithubQuietThresholdMinutes(settingsPath) {
  const data = readSettings(settingsPath);
  return normalizeGithubQuietThresholdMinutes(data.githubQuietThresholdMinutes) ?? DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES;
}

function loadGithubPollIntervalSeconds(settingsPath) {
  const data = readSettings(settingsPath);
  return normalizeGithubPollIntervalSeconds(data.githubPollIntervalSeconds) ?? DEFAULT_GITHUB_POLL_INTERVAL_SECONDS;
}

function saveGithubPollIntervalSeconds(settingsPath, value) {
  const seconds = normalizeGithubPollIntervalSeconds(value);
  if (seconds === null) throw new RangeError('GitHub poll interval must be one of 90, 120, 150, or 180 seconds.');
  writeSettings(settingsPath, { githubPollIntervalSeconds:seconds });
  return seconds;
}

function saveGithubQuietThresholdMinutes(settingsPath, value) {
  const minutes = normalizeGithubQuietThresholdMinutes(value);
  if (minutes === null) {
    throw new RangeError('GitHub quiet threshold must be a whole number from 1 to 180 minutes.');
  }
  writeSettings(settingsPath, { githubQuietThresholdMinutes:minutes });
  return minutes;
}

function loadAssistantCompletionMarker(settingsPath) {
  const data = readSettings(settingsPath);
  if (!Object.prototype.hasOwnProperty.call(data, 'assistantCompletionMarker')) return DEFAULT_ASSISTANT_COMPLETION_MARKER;
  return normalizeAssistantCompletionMarker(data.assistantCompletionMarker);
}

function saveAssistantCompletionMarker(settingsPath, value) {
  const marker = normalizeAssistantCompletionMarker(value);
  if (String(value ?? '').normalize('NFKC').trim().length > 100) {
    throw new RangeError('Assistant completion marker must be 100 characters or fewer.');
  }
  writeSettings(settingsPath, { assistantCompletionMarker:marker });
  return marker;
}

module.exports = {
  DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES,
  DEFAULT_GITHUB_POLL_INTERVAL_SECONDS,
  DEFAULT_ASSISTANT_COMPLETION_MARKER,
  loadGithubQuietThresholdMinutes,
  saveGithubQuietThresholdMinutes,
  loadGithubPollIntervalSeconds,
  saveGithubPollIntervalSeconds,
  loadAssistantCompletionMarker,
  saveAssistantCompletionMarker
};
