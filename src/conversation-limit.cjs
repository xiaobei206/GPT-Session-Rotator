'use strict';

/**
 * Detects the fixed ChatGPT conversation-length-limit banner.
 * It intentionally does not inspect or click any "New chat" controls.
 * The browser-side scanner checks rendered DOM nodes in the main conversation
 * area, including content below the current scroll viewport.
 */
function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[’‘`]/g, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function classifyConversationLimitText(value) {
  const text = normalizeText(value);
  if (!text) return { matched:false, language:null, reason:'empty' };

  const hasChineseConversation = /(?:此|当前|这个)?(?:对话|聊天|会话|對話|會話)/.test(text);
  const hasChineseLength = /(?:长度|長度|上下文|容量)/.test(text);
  const hasChineseLimit = /(?:上限|限制|已满|已滿|达到|達到|超出|最大|过长|過長)/.test(text);
  if (hasChineseConversation && hasChineseLength && hasChineseLimit) {
    return {
      matched:true,
      language:'zh-CN',
      reason:'同一提示中同时出现对话对象、长度/上下文概念和达到上限/超限表述。',
      features:['conversation', 'length-or-context', 'limit-or-reached']
    };
  }

  const hasEnglishConversation = /\b(?:conversation|chat|thread)\b/i.test(text);
  const englishLimitPatterns = [
    /\bmaximum\s+(?:allowed\s+)?length\b/i,
    /\bmaximum\s+(?:number\s+of\s+)?(?:messages|prompts)\b/i,
    /\bmax(?:imum)?\s+length\b/i,
    /\blength\s+(?:limit|maximum)\b/i,
    /\btoo\s+long\b/i,
    /\b(?:reached|exceeded|hit)\b.{0,45}\b(?:maximum\s+length|length\s+limit|conversation\s+limit|chat\s+limit)\b/i,
    /\b(?:conversation|chat|thread)\b.{0,55}\b(?:is\s+)?(?:too\s+long|full|at\s+the\s+limit|has\s+reached\s+(?:its\s+)?(?:maximum\s+length|limit))\b/i,
    /\bcontext\s+(?:length\s+)?(?:limit|window\s+full)\b/i,
    /\bcontext(?:\s+window)?\s+(?:is\s+)?(?:full|limit(?:\s+reached)?)\b/i
  ];
  if (hasEnglishConversation && englishLimitPatterns.some(pattern => pattern.test(text))) {
    return {
      matched:true,
      language:'en',
      reason:'同一提示中同时出现 conversation/chat/thread 与最大长度/对话过长/对话限制表述。',
      features:['conversation', 'maximum-length-or-limit']
    };
  }

  return { matched:false, language:null, reason:'未形成中英文对话长度上限特征组合。' };
}


function analyzeConversationLimitSnapshot(snapshot) {
  const candidates = Array.isArray(snapshot?.candidates) ? snapshot.candidates : [];
  for (const candidate of candidates) {
    // The requested trigger is specifically a red warning box, not any generic alert.
    if (!candidate?.redStyle) continue;
    const classification = classifyConversationLimitText(candidate.text);
    if (!classification.matched) continue;
    return {
      language:classification.language,
      reason:classification.reason,
      features:classification.features,
      text:String(candidate.text || '').slice(0, 420),
      element:{ tag:candidate.tag, role:candidate.role, testId:candidate.testId,
        className:candidate.className, ariaLive:candidate.ariaLive, dataState:candidate.dataState,
        alertSemantic:!!candidate.alertSemantic, redStyle:candidate.redStyle || null, rect:candidate.rect || null },
      pageUrl:String(snapshot?.url || ''),
      pageTitle:String(snapshot?.title || '').slice(0, 300),
      detectedAt:new Date().toISOString()
    };
  }
  return null;
}

const CONVERSATION_LIMIT_SCAN_SCRIPT = `(() => {
  const normalize = value => String(value || '').replace(/\\s+/g, ' ').trim();
  const isRendered = el => {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect?.();
    // Do not clip candidates to window.innerHeight/innerWidth: a warning can
    // be below the current scroll position and still be present in the DOM.
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    for (let current = el; current && mainRoot.contains(current); current = current.parentElement) {
      if (current.getAttribute?.('aria-hidden') === 'true') return false;
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.02) return false;
    }
    return true;
  };
  const mainRoot = document.querySelector('main') || document.querySelector('[role="main"]');
  if (!mainRoot) return { url:location.href, title:document.title, checkedAt:Date.now(), candidateCount:0, candidates:[] };
  const redColor = value => {
    const match = String(value || '').match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/i);
    if (!match) return false;
    const r = Number(match[1]), g = Number(match[2]), b = Number(match[3]);
    return r >= 145 && r > g * 1.22 && r > b * 1.15;
  };
  const alertSemantic = el => {
    const role = (el.getAttribute('role') || '').toLowerCase();
    const live = (el.getAttribute('aria-live') || '').toLowerCase();
    const state = (el.getAttribute('data-state') || '').toLowerCase();
    const testId = (el.getAttribute('data-testid') || '').toLowerCase();
    const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
    return role === 'alert' || role === 'status' || live === 'assertive' ||
      /error|alert|toast|banner/.test(state + ' ' + testId + ' ' + cls);
  };
  const redAncestor = el => {
    let current = el;
    for (let depth = 0; current && mainRoot.contains(current) && depth <= 5; depth++, current = current.parentElement) {
      const style = getComputedStyle(current);
      const frameColors = [style.color, style.backgroundColor, style.borderTopColor, style.borderRightColor,
        style.borderBottomColor, style.borderLeftColor, style.outlineColor];
      const shadowColors = String(style.boxShadow || '').match(/rgba?\([^)]*\)/gi) || [];
      if (frameColors.some(redColor) || shadowColors.some(redColor)) {
        return { tag:current.tagName, color:style.color, backgroundColor:style.backgroundColor,
          borderTopColor:style.borderTopColor, borderRightColor:style.borderRightColor,
          borderBottomColor:style.borderBottomColor, borderLeftColor:style.borderLeftColor,
          outlineColor:style.outlineColor, boxShadow:style.boxShadow };
      }
    }
    return null;
  };
  const excluded = el => !!el.closest?.('nav, aside, [data-testid*="sidebar" i], [aria-label*="sidebar" i], [data-radix-popper-content-wrapper]');
  const textHint = text => {
    const t = text.toLowerCase();
    const cn = /对话|聊天|会话|對話|會話/.test(t) && /长度|長度|上下文|容量/.test(t) && /上限|限制|已满|已滿|达到|達到|超出|最大|过长|過長/.test(t);
    const en = /\\b(conversation|chat|thread)\\b/.test(t) && /maximum|\\bmax\\b|length|too long|limit|context|full|exceeded|messages|prompts/.test(t) || /\\bcontext(?:\\s+window)?\\s+(?:is\\s+)?(?:full|limit)/.test(t);
    return cn || en;
  };
  // Inspect the whole rendered ChatGPT conversation main region regardless
  // of scroll position. Do not inspect body-wide content, sidebars, navigation,
  // or alert portals outside this area.
  const candidates = [];
  const nodes = [mainRoot, ...mainRoot.querySelectorAll('*')];
  for (const el of nodes) {
    if (!isRendered(el) || excluded(el)) continue;
    const text = normalize(el.innerText || el.textContent || '');
    if (text.length < 12 || text.length > 420 || !textHint(text)) continue;
    const semantic = alertSemantic(el);
    const red = redAncestor(el);
    if (!red) continue;
    candidates.push({ text:text.slice(0, 420), tag:el.tagName,
      role:el.getAttribute('role') || '', testId:el.getAttribute('data-testid') || '',
      className:typeof el.className === 'string' ? el.className.slice(0, 300) : '',
      ariaLive:el.getAttribute('aria-live') || '', dataState:el.getAttribute('data-state') || '',
      alertSemantic:semantic, redStyle:red, rect:(() => { const r=el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}; })()
    });
  }
  candidates.sort((a,b) => a.text.length - b.text.length);
  return { url:location.href, title:document.title, checkedAt:Date.now(), candidateCount:candidates.length,
    candidates:candidates.slice(0, 8) };
})()`;

function createConversationLimitConfirmationState() {
  return { fingerprint:null, firstSeenAt:null, lastSeenAt:null };
}

/**
 * Require the same red-box warning to be observed continuously for confirmMs.
 * A missing scan or a long gap resets confirmation instead of assuming that
 * the warning remained visible while it was not being observed.
 */
function observeConversationLimitEvidence(state, detection, now = Date.now(), confirmMs = 5000, maxGapMs = 3500) {
  if (!state || typeof state !== 'object') throw new TypeError('Invalid conversation-limit confirmation state.');
  if (!detection) {
    state.fingerprint = null;
    state.firstSeenAt = null;
    state.lastSeenAt = null;
    return { status:'not-detected', confirmed:false, elapsedMs:0 };
  }

  const fingerprint = `${normalizeText(detection.text)}|${String(detection.pageUrl || '')}|${detection.language || ''}`;
  const isSameCandidate = state.fingerprint === fingerprint && Number.isFinite(state.firstSeenAt) &&
    Number.isFinite(state.lastSeenAt) && now >= state.lastSeenAt && now - state.lastSeenAt <= maxGapMs;

  if (!isSameCandidate) {
    state.fingerprint = fingerprint;
    state.firstSeenAt = now;
    state.lastSeenAt = now;
    return { status:'started', confirmed:false, elapsedMs:0, detection };
  }

  state.lastSeenAt = now;
  const elapsedMs = Math.max(0, now - state.firstSeenAt);
  if (elapsedMs >= confirmMs) {
    return { status:'confirmed', confirmed:true, elapsedMs, detection };
  }
  return { status:'pending', confirmed:false, elapsedMs, detection };
}

module.exports = {
  normalizeText,
  classifyConversationLimitText,
  analyzeConversationLimitSnapshot,
  createConversationLimitConfirmationState,
  observeConversationLimitEvidence,
  CONVERSATION_LIMIT_SCAN_SCRIPT
};
