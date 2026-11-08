'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'style.css'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');

test('start/stop controls stay outside the independently scrollable settings region', () => {
  const toolbarStart = html.indexOf('<div class="controls-toolbar">');
  const scrollStart = html.indexOf('<div class="settings-scroll" id="settingsScroll">');
  const logsStart = html.indexOf('<section class="logs">');

  assert.notEqual(toolbarStart, -1, 'fixed controls toolbar should exist');
  assert.notEqual(scrollStart, -1, 'settings scroll region should exist');
  assert.ok(scrollStart > toolbarStart, 'scroll region follows the fixed toolbar');
  assert.ok(logsStart > scrollStart, 'scroll region is in the left controls card');

  for (const id of ['startBtn', 'stopBtn', 'reloadBtn', 'promptJumpBtn']) {
    const position = html.indexOf(`id="${id}"`);
    assert.ok(position > toolbarStart && position < scrollStart, `${id} must remain outside the scroll region`);
  }

  for (const id of ['proxyEnabled', 'thinkingEnabled', 'githubPollInterval', 'githubToken', 'assistantCompletionMarker', 'prompt']) {
    const position = html.indexOf(`id="${id}"`);
    assert.ok(position > scrollStart && position < logsStart, `${id} must live in the scroll region`);
  }
});

test('settings pane scrolls vertically and the prompt editor remains usable', () => {
  assert.match(css, /\.settings-scroll\{[^}]*overflow-y:auto/);
  assert.match(css, /\.settings-scroll\{[^}]*min-height:0/);
  assert.match(css, /\.controls-toolbar\{[^}]*flex:0 0 auto/);
  assert.match(css, /\.prompt-label\+textarea\{[^}]*min-height:100px/);
  assert.match(css, /\.prompt-label\+textarea\{[^}]*resize:vertical/);
  assert.match(renderer, /\$\('promptJumpBtn'\)\.addEventListener\('click'/);
  assert.match(renderer, /promptBox\.scrollIntoView\(\{ behavior:'smooth', block:'center' \}\)/);
});
