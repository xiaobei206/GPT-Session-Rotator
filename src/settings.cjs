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
const GITHUB_TOKEN_SETTING_KEY = 'githubTokenEncrypted';
const GITHUB_TOKEN_CIPHER_PREFIX = 'electron-safe-storage:v1:';

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

function normalizeGithubToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token || token.length > 512 || /\s/.test(token)) return null;
  return token;
}

function loadGithubQuietThresholdMinutes(settingsPath) {
  const data = readSettings(settingsPath);
  return normalizeGithubQuietThresholdMinutes(data.githubQuietThresholdMinutes) ?? DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES;
}

function loadGithubPollIntervalSeconds(settingsPath, { authenticated = false } = {}) {
  const data = readSettings(settingsPath);
  return normalizeGithubPollIntervalSeconds(data.githubPollIntervalSeconds, { authenticated }) ?? DEFAULT_GITHUB_POLL_INTERVAL_SECONDS;
}

function saveGithubPollIntervalSeconds(settingsPath, value, { authenticated = false } = {}) {
  const numeric = Number(value);
  if (numeric === 30 && !authenticated) {
    throw new RangeError('A GitHub token is required for the 30-second interval; otherwise choose 90, 120, 150, or 180 seconds.');
  }
  const seconds = normalizeGithubPollIntervalSeconds(value, { authenticated });
  if (seconds === null) {
    throw new RangeError('GitHub poll interval must be one of 90, 120, 150, or 180 seconds, or 30 seconds with authentication.');
  }
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

async function loadGithubToken(settingsPath, safeStorage) {
  const stored = readSettings(settingsPath)[GITHUB_TOKEN_SETTING_KEY];
  if (typeof stored !== 'string' || !stored.startsWith(GITHUB_TOKEN_CIPHER_PREFIX)) return '';
  try {
    if (!safeStorage ||
        typeof safeStorage.isAsyncEncryptionAvailable !== 'function' ||
        typeof safeStorage.decryptStringAsync !== 'function' ||
        !(await safeStorage.isAsyncEncryptionAvailable())) return '';
    const encoded = stored.slice(GITHUB_TOKEN_CIPHER_PREFIX.length);
    if (!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) return '';
    const decrypted = await safeStorage.decryptStringAsync(Buffer.from(encoded, 'base64'));
    const token = normalizeGithubToken(decrypted?.result);
    if (!token) return '';
    if (decrypted.shouldReEncrypt === true) {
      const encrypted = await safeStorage.encryptStringAsync(token);
      writeSettings(settingsPath, { [GITHUB_TOKEN_SETTING_KEY]:GITHUB_TOKEN_CIPHER_PREFIX + Buffer.from(encrypted).toString('base64') });
    }
    return token;
  } catch {
    return '';
  }
}

async function saveGithubToken(settingsPath, value, safeStorage) {
  const token = normalizeGithubToken(value);
  if (!token) throw new RangeError('GitHub Token 不能为空，且不能包含空白字符或超过 512 个字符。');
  if (!safeStorage ||
      typeof safeStorage.isAsyncEncryptionAvailable !== 'function' ||
      typeof safeStorage.encryptStringAsync !== 'function' ||
      !(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('操作系统安全存储不可用，未保存 GitHub Token。');
  }
  const encrypted = Buffer.from(await safeStorage.encryptStringAsync(token));
  if (!encrypted.length) throw new Error('GitHub Token 加密结果为空，未保存。');
  writeSettings(settingsPath, {
    [GITHUB_TOKEN_SETTING_KEY]:GITHUB_TOKEN_CIPHER_PREFIX + encrypted.toString('base64')
  });
  return true;
}

function clearGithubToken(settingsPath) {
  writeSettings(settingsPath, { [GITHUB_TOKEN_SETTING_KEY]:null });
  return true;
}

module.exports = {
  DEFAULT_GITHUB_QUIET_THRESHOLD_MINUTES,
  DEFAULT_GITHUB_POLL_INTERVAL_SECONDS,
  DEFAULT_ASSISTANT_COMPLETION_MARKER,
  GITHUB_TOKEN_SETTING_KEY,
  GITHUB_TOKEN_CIPHER_PREFIX,
  normalizeGithubToken,
  loadGithubToken,
  saveGithubToken,
  clearGithubToken,
  loadGithubQuietThresholdMinutes,
  saveGithubQuietThresholdMinutes,
  loadGithubPollIntervalSeconds,
  saveGithubPollIntervalSeconds,
  loadAssistantCompletionMarker,
  saveAssistantCompletionMarker
};
