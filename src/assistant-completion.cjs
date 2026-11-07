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
  const hasStableBaselineIds = baselineIds.size > 0;
  const eligible = messages.filter(message => {
    if (!message || typeof message.text !== 'string') return false;
    if (hasStableBaselineIds) return !baselineIds.has(String(message.id || ''));
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
    isGenerating:snapshot?.isGenerating === true
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

  const fingerprint = `${detection.messageId}|${detection.marker}|${detection.pageUrl}`;
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

const ASSISTANT_COMPLETION_SCAN_SCRIPT = `(() => {
  const root = document.querySelector('main') || document.querySelector('[role="main"]');
  if (!root) return { url:location.href, assistantCount:0, assistantMessages:[], isGenerating:false };
  const normalize = value => String(value || '').replace(/\\s+/g, ' ').trim();
  const isRendered = el => {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    for (let current = el; current && root.contains(current); current = current.parentElement) {
      const style = getComputedStyle(current);
      if (current.getAttribute?.('aria-hidden') === 'true' || style.display === 'none' ||
        style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.02) return false;
    }
    return true;
  };
  const nodes = [...root.querySelectorAll('[data-message-author-role="assistant"]')].filter(isRendered);
  const assistantMessages = nodes.map((el, index) => {
    const turn = el.closest('[data-testid^="conversation-turn-"]');
    const id = el.getAttribute('data-message-id') || el.id || turn?.getAttribute('data-testid') || ('assistant-' + index);
    return { id:String(id), index, text:normalize(el.innerText || el.textContent || '') };
  });
  const controls = [...root.querySelectorAll('button,[role="button"]')];
  const isGenerating = controls.some(el => {
    if (!isRendered(el)) return false;
    const label = [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-testid'), el.innerText]
      .filter(Boolean).join(' ').replace(/\\s+/g, ' ').trim();
    return /stop[- ]button|stop generating|stop streaming|停止生成|停止回答|停止响应|停止回應/i.test(label);
  });
  return { url:location.href, assistantCount:nodes.length, assistantMessages:assistantMessages.slice(-8), isGenerating };
})()`;

module.exports = {
  DEFAULT_ASSISTANT_COMPLETION_MARKER,
  normalizeAssistantCompletionMarker,
  analyzeAssistantCompletionSnapshot,
  createAssistantCompletionState,
  observeAssistantCompletion,
  ASSISTANT_COMPLETION_SCAN_SCRIPT
};
