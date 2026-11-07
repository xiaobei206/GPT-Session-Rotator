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
    marker:'结束任务简报', messageId:'new-message', pageUrl:'https://chatgpt.com/c/new', isGenerating:false, textSignature:''
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


test('detects the current reply when ChatGPT fills an assistant placeholder that existed before submit', () => {
  const snapshot = { url:'https://chatgpt.com/c/current', isGenerating:false, assistantMessages:[
    { id:'assistant-placeholder', index:0, text:'最终状态：本轮' }
  ] };
  const detection = analyzeAssistantCompletionSnapshot(snapshot, '本轮', {
    count:1, ids:['assistant-placeholder'], emptyIds:['assistant-placeholder']
  });
  assert.equal(detection?.marker, '本轮');
  assert.equal(detection?.messageId, 'assistant-placeholder');
});

test('does not treat a populated pre-submit assistant node as new when its content later changes', () => {
  const snapshot = { url:'https://chatgpt.com/c/current', isGenerating:false, assistantMessages:[
    { id:'old-populated-message', index:0, text:'历史内容更新后提到了本轮' }
  ] };
  assert.equal(analyzeAssistantCompletionSnapshot(snapshot, '本轮', {
    count:1, ids:['old-populated-message'], emptyIds:[]
  }), null);
});


test('assistant completion confirmation restarts when the marked reply continues changing', () => {
  const state = createAssistantCompletionState();
  const first = { marker:'本轮', messageId:'turn-1', pageUrl:'https://chatgpt.com/c/1', isGenerating:false, textSignature:'10:a' };
  const changed = { ...first, textSignature:'20:b' };
  assert.equal(observeAssistantCompletion(state, first, 1000).status, 'started');
  assert.equal(observeAssistantCompletion(state, changed, 2500).status, 'started');
  const stable = observeAssistantCompletion(state, changed, 4000);
  assert.equal(stable.confirmed, true);
  assert.equal(stable.elapsedMs, 1500);
});

test('scanner finds current app-shell assistant markdown nodes and returns structure-only diagnostics', () => {
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /data-markdown-text-style/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /data-turn-key/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /data-content-search-unit-key/);
  assert.match(ASSISTANT_COMPLETION_SCAN_SCRIPT, /data-app-action-timeline-scroll/);

  const html = {
    isConnected:true, parentElement:null, innerText:'',
    getAttribute() { return null; },
    getBoundingClientRect() { return { width:1400, height:900 }; }
  };
  let wrapper, content;
  const root = {
    isConnected:true, parentElement:html, innerText:'ChatGPT said: 本轮完成',
    getAttribute() { return null; },
    getBoundingClientRect() { return { width:1200, height:700 }; },
    querySelectorAll(selector) {
      return selector === '[data-markdown-text-style="assistant-message"]' ? [content] : [];
    }
  };
  wrapper = {
    isConnected:true, parentElement:root,
    getAttribute(name) { return name === 'data-turn-key' ? 'app-shell-turn-42' : null; },
    closest() { return this; },
    querySelector() { return content; },
    getBoundingClientRect() { return { width:1100, height:160 }; }
  };
  content = {
    isConnected:true, parentElement:wrapper, innerText:'最终回显：本轮完成', textContent:'',
    getAttribute() { return null; },
    matches(selector) { return selector === '[data-markdown-text-style="assistant-message"]'; },
    closest() { return wrapper; },
    getBoundingClientRect() { return { width:1000, height:80 }; }
  };
  const documentMock = {
    body:root, documentElement:html,
    querySelector(selector) {
      return selector === '[data-app-action-timeline-scroll][role="region"]' ? root : null;
    },
    querySelectorAll() { return []; }
  };
  const getComputedStyleMock = () => ({ display:'block', visibility:'visible', opacity:'1' });
  const runScanner = new Function('document', 'location', 'getComputedStyle', 'return ' + ASSISTANT_COMPLETION_SCAN_SCRIPT + ';');
  const snapshot = runScanner(documentMock, { href:'https://chatgpt.com/c/app-shell' }, getComputedStyleMock);
  assert.equal(snapshot.assistantCount, 1);
  assert.equal(snapshot.assistantMessages[0].id, 'app-shell-turn-42');
  assert.equal(snapshot.assistantMessages[0].text, '最终回显：本轮完成');
  assert.ok(snapshot.assistantMessages[0].textSignature);
  assert.equal(snapshot.assistantMessages[0].source, 'assistant-markdown');
  assert.equal(snapshot.diagnostics.selectorHits['assistant-markdown'], 1);
  assert.equal(snapshot.diagnostics.rootSelector, 'app-timeline');
  assert.equal(snapshot.isGenerating, false);
  assert.equal(Object.hasOwn(snapshot.diagnostics, 'pageText'), false);
});
