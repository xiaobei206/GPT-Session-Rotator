'use strict';

const DEFAULT_ASSISTANT_COMPLETION_MARKER = '结束任务简报';

function normalizeAssistantCompletionMarker(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function normalizeAssistantText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Only inspect assistant messages added after the pre-submit baseline.
 * Message text is kept in memory for matching only and is never logged or saved.
 */
function analyzeAssistantCompletionSnapshot(snapshot, marker, baseline = null) {
  const normalizedMarker = normalizeAssistantCompletionMarker(marker);
  if (!normalizedMarker) return null;

  const messages = Array.isArray(snapshot?.assistantMessages) ? snapshot.assistantMessages : [];
  const baselineCount = Number.isInteger(baseline?.count) && baseline.count >= 0 ? baseline.count : null;
  const baselineIds = new Set(Array.isArray(baseline?.ids) ? baseline.ids.map(String) : []);
  const baselineEmptyIds = new Set(Array.isArray(baseline?.emptyIds) ? baseline.emptyIds.map(String) : []);
  const hasStableBaselineIds = baselineIds.size > 0;
  const eligible = messages.filter(message => {
    if (!message || typeof message.text !== 'string') return false;
    if (hasStableBaselineIds) {
      const id = String(message.id || '');
      // ChatGPT may create an empty assistant placeholder before submit and
      // populate that same DOM node while streaming the new response. Accept
      // only placeholders that were provably empty at baseline; populated old
      // assistant messages remain excluded.
      return !baselineIds.has(id) || baselineEmptyIds.has(id);
    }
    if (baselineCount !== null && Number.isInteger(message.index) && message.index < baselineCount) return false;
    return true;
  });

  // ChatGPT can append a trailing empty/status assistant node after the
  // assistant message containing the completion marker. Search all new
  // assistant messages from newest to oldest; the pre-submit baseline still
  // excludes old replies.
  const latestMatching = [...eligible].reverse().find(message =>
    normalizeAssistantText(message.text).includes(normalizedMarker)
  );
  if (!latestMatching) return null;

  return {
    marker:normalizedMarker,
    messageId:String(latestMatching.id || `assistant-${latestMatching.index ?? 'latest'}`),
    pageUrl:String(snapshot?.url || ''),
    isGenerating:snapshot?.isGenerating === true,
    textSignature:String(latestMatching.textSignature || '')
  };
}

function createAssistantCompletionState() {
  return { fingerprint:null, firstSeenAt:null, lastSeenAt:null };
}

/**
 * Require a completed (not streaming) assistant reply with a stable marker.
 * The default confirmation is one additional 1.5-second DOM poll.
 */
function observeAssistantCompletion(state, detection, now = Date.now(), confirmMs = 1500, maxGapMs = 3500) {
  if (!state || typeof state !== 'object') throw new TypeError('Invalid assistant-completion confirmation state.');
  if (!detection || detection.isGenerating) {
    state.fingerprint = null;
    state.firstSeenAt = null;
    state.lastSeenAt = null;
    return { status:detection?.isGenerating ? 'generating' : 'not-detected', confirmed:false, elapsedMs:0 };
  }

  const fingerprint = `${detection.messageId}|${detection.marker}|${detection.pageUrl}|${detection.textSignature || ''}`;
  const same = state.fingerprint === fingerprint && Number.isFinite(state.firstSeenAt) &&
    Number.isFinite(state.lastSeenAt) && now >= state.lastSeenAt && now - state.lastSeenAt <= maxGapMs;

  if (!same) {
    state.fingerprint = fingerprint;
    state.firstSeenAt = now;
    state.lastSeenAt = now;
    return { status:'started', confirmed:false, elapsedMs:0, detection };
  }

  state.lastSeenAt = now;
  const elapsedMs = Math.max(0, now - state.firstSeenAt);
  if (elapsedMs >= confirmMs) return { status:'confirmed', confirmed:true, elapsedMs, detection };
  return { status:'pending', confirmed:false, elapsedMs, detection };
}

const ASSISTANT_COMPLETION_SCAN_SCRIPT = "(() => {\n  const rootCandidates = [\n    ['app-timeline', '[data-app-action-timeline-scroll][role=\"region\"]'],\n    ['transcript-root', '[data-thread-user-message-navigation-content]'],\n    ['conversation-root', '[data-thread-find-target=\"conversation\"]'],\n    ['thread-bottom', '#thread-bottom-container'], ['main', 'main'], ['role-main', '[role=\"main\"]']\n  ];\n  let root = null, rootSelector = 'body-fallback';\n  for (const [name, selector] of rootCandidates) {\n    try { root = document.querySelector(selector); if (root) { rootSelector = name; break; } } catch {}\n  }\n  root = root || document.body || document.documentElement;\n  const normalize = value => String(value || '').normalize('NFKC').replace(/[\\u200B-\\u200D\\uFEFF]/g, '').replace(/\\s+/g, ' ').trim();\n  const textSignature = value => {\n    let hash = 2166136261;\n    for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);\n    return value.length + ':' + (hash >>> 0).toString(36);\n  };\n  const getAttr = (el, name) => { try { return el?.getAttribute?.(name) || ''; } catch { return ''; } };\n  const isRendered = el => {\n    if (!el || !el.isConnected) return false;\n    let rect;\n    try { rect = el.getBoundingClientRect?.(); } catch { return false; }\n    if (!rect || rect.width <= 0 || rect.height <= 0) return false;\n    for (let current = el; current; current = current.parentElement) {\n      try {\n        const style = getComputedStyle(current);\n        if (current.getAttribute?.('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.02) return false;\n      } catch { return false; }\n      if (current === document.documentElement) break;\n    }\n    return true;\n  };\n  const wrapperSelector = ['[data-message-author-role=\"assistant\"]','[data-message-role=\"assistant\"]','[data-role=\"assistant\"]','[data-message-author=\"assistant\"]','article[data-turn=\"assistant\"]','[data-turn-key]','[data-content-search-turn-key]','[data-content-search-unit-key$=\":assistant\"]','.agent-turn'].join(',');\n  const selectorSpecs = [\n    ['author-role','[data-message-author-role=\"assistant\"]'], ['message-role','[data-message-role=\"assistant\"]'],\n    ['data-role','[data-role=\"assistant\"]'], ['message-author','[data-message-author=\"assistant\"]'],\n    ['turn-article','article[data-turn=\"assistant\"]'], ['assistant-markdown','[data-markdown-text-style=\"assistant-message\"]'],\n    ['content-search-unit','[data-content-search-unit-key$=\":assistant\"]'], ['agent-turn','.agent-turn']\n  ];\n  const selectorHits = {}, candidates = [];\n  for (const [source, selector] of selectorSpecs) {\n    let found = [];\n    try { found = [...root.querySelectorAll(selector)]; } catch {}\n    selectorHits[source] = found.length;\n    for (const element of found) candidates.push({ element, source });\n  }\n  const messages = [], seenIds = new Set();\n  let rejectedByVisibilityCount = 0;\n  for (const candidate of candidates) {\n    const sourceNode = candidate.element;\n    if (!isRendered(sourceNode)) { rejectedByVisibilityCount += 1; continue; }\n    let wrapper = sourceNode;\n    try { wrapper = sourceNode.closest?.(wrapperSelector) || sourceNode; } catch {}\n    let textNode = sourceNode;\n    if (!sourceNode.matches?.('[data-markdown-text-style=\"assistant-message\"]')) {\n      try { textNode = wrapper.querySelector?.('[data-markdown-text-style=\"assistant-message\"], .markdown, .prose') || sourceNode; } catch {}\n    }\n    const rawText = textNode?.innerText || textNode?.textContent || sourceNode?.innerText || sourceNode?.textContent || '';\n    const text = normalize(rawText), identityNodes = [wrapper, sourceNode];\n    let id = '';\n    for (const node of identityNodes) {\n      id = getAttr(node,'data-message-id') || getAttr(node,'data-turn-id') || getAttr(node,'data-turn-key') ||\n        getAttr(node,'data-content-search-turn-key') || getAttr(node,'data-content-search-unit-key') ||\n        getAttr(node,'id') || getAttr(node,'data-testid') || getAttr(node,'data-test-id');\n      if (id) break;\n    }\n    if (!id) id = 'assistant-' + messages.length;\n    if (seenIds.has(id)) continue;\n    seenIds.add(id);\n    messages.push({ id:String(id), index:messages.length, text, textSignature:textSignature(text), source:candidate.source });\n  }\n  const controls = (() => { try { return [...document.querySelectorAll('button,[role=\"button\"],[aria-label],[title]')]; } catch { return []; } })();\n  const stopControlFound = controls.some(el => {\n    if (!isRendered(el)) return false;\n    const label = [getAttr(el,'aria-label'),getAttr(el,'title'),getAttr(el,'data-testid'),getAttr(el,'data-test-id'),el.innerText].filter(Boolean).join(' ').replace(/\\s+/g,' ').trim();\n    return /stop[- ]button|stop generating|stop streaming|停止生成|停止回答|停止响应|停止回應/i.test(label);\n  });\n  let streamStateFound = false;\n  try {\n    streamStateFound = [...root.querySelectorAll('[data-talvt-turn-state],[data-streaming=\"true\"],[data-is-streaming=\"true\"],[aria-busy=\"true\"],.group-data-stream-active')].some(el => {\n      const state = [getAttr(el,'data-talvt-turn-state'),getAttr(el,'data-streaming'),getAttr(el,'data-is-streaming'),getAttr(el,'aria-busy'),String(el.className || '')].join(' ');\n      return /stream|generat|pending|in[-_ ]?progress|true/i.test(state);\n    });\n  } catch {}\n  return {\n    url:location.href, assistantCount:messages.length, assistantMessages:messages.slice(-12),\n    isGenerating:stopControlFound || streamStateFound,\n    diagnostics:{ rootSelector, rootFound:rootSelector !== 'body-fallback', selectorHits, rawCandidateCount:candidates.length,\n      visibleCandidateCount:messages.length, rejectedByVisibilityCount, stopControlFound, streamStateFound,\n      rootTextLength:Number(root?.innerText?.length || 0) }\n  };\n})()";

module.exports = {
  DEFAULT_ASSISTANT_COMPLETION_MARKER,
  normalizeAssistantCompletionMarker,
  analyzeAssistantCompletionSnapshot,
  createAssistantCompletionState,
  observeAssistantCompletion,
  ASSISTANT_COMPLETION_SCAN_SCRIPT
};
