'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_ASSISTANT_COMPLETION_MARKER,
  normalizeAssistantCompletionMarker,
  analyzeAssistantCompletionSnapshot,
  createAssistantCompletionState,
  observeAssistantCompletion,
  ASSISTANT_COMPLETION_SCAN_SCRIPT
} = require('../src/assistant-completion.cjs');

test('default completion marker is the task-end brief heading', () => {
  assert.equal(DEFAULT_ASSISTANT_COMPLETION_MARKER, '结束任务简报');
});

test('completion marker is normalized and supports custom values', () => {
  assert.equal(normalizeAssistantCompletionMarker('  结束任务简报  '), '结束任务简报');
  assert.equal(normalizeAssistantCompletionMarker('任務完成'), '任務完成');
  assert.equal(normalizeAssistantCompletionMarker(''), '');
  assert.equal(normalizeAssistantCompletionMarker('标记'.repeat(80)).length, 100);
});

test('only a new assistant reply after the pre-submit baseline can trigger', () => {
  const snapshot = {
    url:'https://chatgpt.com/c/new',
    isGenerating:false,
    assistantMessages:[
      { id:'old-message', index:0, text:'上一轮的结束任务简报' },
      { id:'new-message', index:1, text:'完成后回显：结束任务简报' }
    ]
  };
  const detection = analyzeAssistantCompletionSnapshot(snapshot, '结束任务简报', { count:1, ids:['old-message'] });
  assert.deepEqual(detection, {
    marker:'结束任务简报', messageId:'new-message', pageUrl:'https://chatgpt.com/c/new', isGenerating:false
  });
});

test('stable message IDs allow detection even when the chat DOM is virtualized', () => {
  const snapshot = {
    url:'https://chatgpt.com/c/virtualized', isGenerating:false,
    assistantMessages:[{ id:'turn-17', index:7, text:'结束任务简报' }]
  };
  const result = analyzeAssistantCompletionSnapshot(snapshot, '结束任务简报', {
    count:17, ids:['turn-10','turn-11','turn-12','turn-13','turn-14','turn-15','turn-16']
  });
  assert.equal(result?.messageId, 'turn-17');
});

test('old assistant response is ignored when no new assistant message has been added', () => {
  const snapshot = {
    url:'https://chatgpt.com/c/old', isGenerating:false,
    assistantMessages:[{ id:'old-message', index:0, text:'结束任务简报' }]
  };
  assert.equal(analyzeAssistantCompletionSnapshot(snapshot, '结束任务简报', { count:1, ids:['old-message'] }), null);
});

test('marker detection supports custom marker and can be disabled with an empty setting', () => {
  const snapshot = { assistantMessages:[{ id:'m1', index:0, text:'DONE: task report' }], isGenerating:false };
  assert.equal(analyzeAssistantCompletionSnapshot(snapshot, 'DONE: task report', { count:0 })?.marker, 'DONE: task report');
  assert.equal(analyzeAssistantCompletionSnapshot(snapshot, '', { count:0 }), null);
});

test('generation-in-progress never confirms; completed marker is confirmed on the next stable poll', () => {
  const state = createAssistantCompletionState();
  const generating = { marker:'结束任务简报', messageId:'a1', pageUrl:'https://chatgpt.com/c/1', isGenerating:true };
  const completed = { ...generating, isGenerating:false };
  assert.equal(observeAssistantCompletion(state, generating, 1000).status, 'generating');
  assert.equal(observeAssistantCompletion(state, completed, 2000).status, 'started');
  const confirmed = observeAssistantCompletion(state, completed, 3500);
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.elapsedMs, 1500);
});

test('confirmation resets if the marker disappears, message changes, or page changes', () => {
  const state = createAssistantCompletionState();
  const a = { marker:'结束任务简报', messageId:'a1', pageUrl:'https://chatgpt.com/c/1', isGenerating:false };
  const b = { ...a, messageId:'a2' };
  assert.equal(observeAssistantCompletion(state, a, 1000).status, 'started');
  assert.equal(observeAssistantCompletion(state, null, 2000).status, 'not-detected');
  assert.equal(observeAssistantCompletion(state, a, 3000).status, 'started');
  assert.equal(observeAssistantCompletion(state, b, 4000).status, 'started');
  assert.equal(observeAssistantCompletion(state, b, 6000).confirmed, true);
});

test('browser scanner only reads assistant message nodes inside main and detects generation stop controls', () => {
  assert.doesNotThrow(() => new Function(`return ${ASSISTANT_COMPLETION_SCAN_SCRIPT}`));
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /data-message-author-role="assistant"/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /stop generating|停止生成/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /const isRendered/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /if \(!isRendered\(el\)\) return false/);
  assert.doesNotMatch(ASSISTANT_COMPLETION_SCAN_SCRIPT, /window\.innerHeight|window\.innerWidth/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /document\.querySelector\('main'\)/);
  assert.doesNotMatch(ASSISTANT_COMPLETION_SCAN_SCRIPT, /document\.body/);
});

test('finds the custom completion marker when ChatGPT appends a trailing empty assistant node', () => {
  const snapshot = { url:'https://chatgpt.com/c/current', isGenerating:false, assistantMessages:[
    { id:'old-message', index:0, text:'上一轮本轮完成' },
    { id:'new-marker-message', index:1, text:'本轮完成' },
    { id:'new-trailing-node', index:2, text:'' }
  ] };
  const detection = analyzeAssistantCompletionSnapshot(snapshot, '本轮完成', { count:1, ids:['old-message'] });
  assert.equal(detection?.marker, '本轮完成');
  assert.equal(detection?.messageId, 'new-marker-message');
  assert.equal(detection?.isGenerating, false);
});

test('does not match an old marker when the latest new assistant reply has no marker', () => {
  const snapshot = { url:'https://chatgpt.com/c/current', isGenerating:false, assistantMessages:[
    { id:'old-marker-message', index:0, text:'本轮完成' },
    { id:'new-message', index:1, text:'其他回复内容' }
  ] };
  assert.equal(analyzeAssistantCompletionSnapshot(snapshot, '本轮完成', { count:1, ids:['old-marker-message'] }), null);
});
