const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyConversationLimitText,
  analyzeConversationLimitSnapshot,
  createConversationLimitConfirmationState,
  observeConversationLimitEvidence,
  CONVERSATION_LIMIT_SCAN_SCRIPT
} = require('../src/conversation-limit.cjs');

test('detects the current Chinese ChatGPT conversation-length banner without exact full-string matching', () => {
  const result = classifyConversationLimitText('您已达到此对话的长度上限，您可以开始新聊天以继续对话');
  assert.equal(result.matched, true);
  assert.equal(result.language, 'zh-CN');
});

test('detects alternate Chinese wording and Traditional Chinese', () => {
  assert.equal(classifyConversationLimitText('当前会话长度已达到最大上限').matched, true);
  assert.equal(classifyConversationLimitText('此對話已達到長度上限').matched, true);
});

test('detects common English variants', () => {
  const samples = [
    "You've reached the maximum length for this conversation, but you can keep talking by starting a new chat.",
    'This conversation has reached its maximum length. Start a new chat to continue.',
    'This chat is too long. Start a new conversation.',
    'The conversation length limit has been reached.'
  ];
  for (const sample of samples) {
    const result = classifyConversationLimitText(sample);
    assert.equal(result.matched, true, sample);
    assert.equal(result.language, 'en');
  }
});

test('does not confuse usage quota, a single oversized prompt, or a sidebar button with conversation length', () => {
  const samples = [
    'You have reached your message limit for today.',
    'This message is too long. Please shorten it.',
    'Start a new chat',
    'You have reached the model usage limit.'
  ];
  for (const sample of samples) assert.equal(classifyConversationLimitText(sample).matched, false, sample);
});

test('requires red-frame evidence inside main content before rotating', () => {
  const text = "You've reached the maximum length for this conversation. Start a new chat.";
  assert.equal(analyzeConversationLimitSnapshot({ candidates:[{ text, alertSemantic:true }] }), null);
  const match = analyzeConversationLimitSnapshot({
    url:'https://chatgpt.com/c/example',
    candidates:[{ text, tag:'DIV', role:'', alertSemantic:false, redStyle:{ tag:'DIV', borderTopColor:'rgb(220, 38, 38)' }, rect:{ x:20, y:30, width:500, height:80 } }]
  });
  assert.equal(match.language, 'en');
  assert.match(match.text, /maximum length/i);
  assert.equal(match.element.redStyle.borderTopColor, 'rgb(220, 38, 38)');
});

test('red warning text color itself qualifies even without a red frame', () => {
  const text = '您已达到此对话的长度上限';
  const match = analyzeConversationLimitSnapshot({
    url:'https://chatgpt.com/c/example',
    candidates:[{ text, tag:'P', redStyle:{ tag:'P', color:'rgb(220, 38, 38)' } }]
  });
  assert.equal(match.language, 'zh-CN');
  assert.equal(match.element.redStyle.color, 'rgb(220, 38, 38)');
});

test('browser-side scanner source is valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(`return ${CONVERSATION_LIMIT_SCAN_SCRIPT}`));
});

test('page scanner is limited to the main conversation area and does not click new-chat controls', () => {
  assert.match(CONVERSATION_LIMIT_SCAN_SCRIPT, /document\.querySelector\('main'\)/);
  assert.match(CONVERSATION_LIMIT_SCAN_SCRIPT, /const mainRoot = document\.querySelector/);
  assert.doesNotMatch(CONVERSATION_LIMIT_SCAN_SCRIPT, /const alertRoots/);
  assert.doesNotMatch(CONVERSATION_LIMIT_SCAN_SCRIPT, /document\.body/);
  assert.match(CONVERSATION_LIMIT_SCAN_SCRIPT, /nav, aside/);
  assert.match(CONVERSATION_LIMIT_SCAN_SCRIPT, /sidebar/);
  assert.match(CONVERSATION_LIMIT_SCAN_SCRIPT, /const isRendered/);
  assert.match(CONVERSATION_LIMIT_SCAN_SCRIPT, /style\.color/);
  assert.doesNotMatch(CONVERSATION_LIMIT_SCAN_SCRIPT, /rect\.right\s*<=\s*0|rect\.bottom\s*<=\s*0|rect\.left\s*>=\s*window\.innerWidth|rect\.top\s*>=\s*window\.innerHeight/);
  assert.doesNotMatch(CONVERSATION_LIMIT_SCAN_SCRIPT, /\.click\s*\(/);
});


test('same red-box warning must remain continuously visible for five seconds', () => {
  const state = createConversationLimitConfirmationState();
  const detection = { text:'您已达到此对话的长度上限', language:'zh-CN', pageUrl:'https://chatgpt.com/c/1' };
  assert.equal(observeConversationLimitEvidence(state, detection, 1000, 5000).status, 'started');
  assert.equal(observeConversationLimitEvidence(state, detection, 2500, 5000).confirmed, false);
  assert.equal(observeConversationLimitEvidence(state, detection, 4000, 5000).confirmed, false);
  const confirmed = observeConversationLimitEvidence(state, detection, 6000, 5000);
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.elapsedMs, 5000);
});

test('confirmation resets when warning disappears, changes, or observation gap is too long', () => {
  const state = createConversationLimitConfirmationState();
  const a = { text:'This conversation has reached its maximum length', language:'en', pageUrl:'https://chatgpt.com/c/1' };
  const b = { ...a, text:'This chat is too long' };
  assert.equal(observeConversationLimitEvidence(state, a, 1000).status, 'started');
  assert.equal(observeConversationLimitEvidence(state, null, 2500).status, 'not-detected');
  assert.equal(observeConversationLimitEvidence(state, a, 3000).status, 'started');
  assert.equal(observeConversationLimitEvidence(state, b, 4500).status, 'started');
  assert.equal(observeConversationLimitEvidence(state, b, 9000).status, 'started');
  assert.equal(observeConversationLimitEvidence(state, b, 10500).confirmed, false);
});
