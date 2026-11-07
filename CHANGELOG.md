## 0.1.15 - 2026-11-08

- Fixed assistant completion detection for the newer ChatGPT app-shell DOM. The scanner now supports app timeline/transcript roots, assistant markdown nodes marked with `data-markdown-text-style="assistant-message"`, and stable turn/content-search keys, while retaining legacy message-role selectors.
- Added selector-health diagnostics that report selector hit counts, root selection, candidate counts, and visibility filtering without logging page text or assistant response content.
- Stability confirmation now includes an in-memory text signature. If the assistant continues appending text after the marker first appears, confirmation restarts instead of rotating on a stale snapshot.
- Added regression coverage for app-shell assistant nodes and marker-bearing replies that continue changing.

## 0.1.14 - 2026-11-08

- Fixed assistant completion detection when ChatGPT creates an empty assistant message before submission and fills that same node with the current reply. The baseline now records IDs of empty placeholders, allowing those nodes to become eligible after being populated while continuing to exclude pre-existing messages that already contained text.
- Added a first-scan progress event that reports whether the assistant DOM scanner is active and the number of assistant message nodes found, without logging reply content.
- Added regression tests for reused empty placeholders and continued exclusion of populated historical messages.

## 0.1.13 - 2026-11-08

- Fixed custom assistant completion markers being missed when ChatGPT appends an empty or auxiliary assistant DOM node after the reply containing the marker. The detector now searches all newly-added assistant messages from newest to oldest while continuing to exclude every message in the pre-submit baseline.
- Added runtime progress events when the configured marker is found while ChatGPT is still generating, and when generation has stopped and the detector is performing stability confirmation. This makes the reason for waiting observable without logging or persisting assistant reply text.
- Added regression coverage for the exact custom marker `本轮完成`, including a trailing empty assistant node, and for ignoring marker text in old replies.

# Changelog

## 0.1.12 - 2026-11-07

- Fixed red conversation-length warning detection so rendered nodes anywhere inside the ChatGPT main conversation region are checked even when they are below the current scroll viewport; red text color is accepted as warning evidence as well as red borders/backgrounds; sidebar, navigation, and out-of-main portals remain excluded.
- Added a configurable assistant reply completion marker (default: `结束任务简报`). Only assistant messages added after the current cycle's pre-submit baseline are considered; user prompt text and old assistant messages cannot trigger it.
- Assistant-marker rotation waits until ChatGPT's generation stop control disappears and the same completed message remains detectable across the next DOM poll, then starts the next normal automation cycle immediately.
- The marker is stored in `settings.json`, can be edited while automation is running, and can be left blank to disable this trigger. No rebuild is required to change it.
- Kept the five-second continuous confirmation for red length-limit warnings, the 15-minute configurable GitHub quiet threshold, 90-second GitHub polling, and the manual maximum wait as fallback.
- Kept lightweight privacy behavior: reply text is inspected in memory only for marker matching; full assistant messages, page bodies, API bodies, SSE/WebSocket payloads, and diagnostic bundles are not saved or logged.

## 0.1.11 - 2026-11-06

- Added a persistent GitHub main-branch quiet-time threshold setting (default 15 minutes, configurable from 1 to 180 minutes).
- GitHub quiet-time changes now apply to an active automation run without restarting it; lowering the threshold can trigger rotation using the most recent valid observation.
- Kept the GitHub polling interval at 90 seconds and retained startup SHA baselining so pre-existing commits cannot trigger rotation.
- Restricted conversation-length detection to red-framed warnings inside the ChatGPT main content region; generic alert text, sidebars, navigation, and out-of-main portals do not qualify.
- Added a continuous five-second confirmation window for the same Chinese or English conversation-length warning before early rotation.
- Confirmed warnings continue through the existing next-cycle automation flow; the manual maximum-wait timer remains the fallback.
- Kept lightweight operation: no page bodies, API request/response bodies, or diagnostic bundles are collected.

## 0.1.10

- Fixes an immediate-rotation bug in 0.1.9: a repository commit that was already older than six minutes when the user started automation is now treated as a startup baseline and cannot trigger rotation.
- Captures the baseline from GitHub as soon as automation starts, before the first prompt workflow proceeds. If that initial request fails, the first later successful poll only establishes the baseline; it never rotates on that first observation.
- Only commits whose SHA appears after the startup baseline are eligible. Such a commit can trigger once its GitHub-server-calculated age reaches six minutes; a newer SHA resets the candidate.
- Keeps 90-second polling, GitHub Date-based timing, proxy-aware Electron session fetches, manual interval timing, conversation-length detection, and lightweight logging unchanged.
- Adds regression tests for stale startup commits, candidate changes, baseline restoration, and once-only triggers.

## 0.1.9

- Removes the always-on Chromium/CDP network capture, request/response body recording, diagnostics session folders, and one-click diagnostics ZIP export. The runtime no longer writes page bodies or protocol capture logs.
- Preserves the 0.1.8 automation flow, Think retries, configured manual wait, and Chinese/English conversation-length red-banner early rotation.
- Adds GitHub `main` branch monitoring for `xiaobei206/padavan-4.4-2`: checks every 90 seconds during each wait window and starts the next conversation once the latest commit has been quiet for at least six minutes.
- Calculates commit age from GitHub's HTTP `Date` response header and the commit timestamp, so VPS timezone and local clock settings do not affect the quiet-time decision. Missing/invalid server time or API failures do not trigger rotation.
- A given commit SHA can trigger early rotation only once during one continuous automation run. Stopping and starting automation begins a fresh check; a newer SHA starts a new quiet-time decision.
- GitHub requests use the same Electron session as the embedded browser, so the app's configured SOCKS5/HTTP proxy also applies to GitHub checks.
- Retains the manual interval selector and custom minutes field; adds 40 minutes and removes 60 minutes.

## 0.1.8

- Adds a policy-based reduction in diagnostics output. This release is retained as historical source only; 0.1.9 removes diagnostics entirely.

## 0.1.7

- Adds automatic early rotation when the current conversation reaches its length/context ceiling during the configured post-submit wait window.
- Checks the current main conversation area every 1.5 seconds; Chinese and English wording variants are supported without exact full-sentence matching.
- Requires a visible red-styled or alert-semantic element plus conversation-length wording. The detector does not inspect/click “New chat” controls, avoiding conflicts with the sidebar button.
- Keeps the configured wait as a maximum: no match means the next cycle begins at the original interval; a confirmed banner starts the next cycle immediately.

## 0.1.6

- Historical diagnostics-only release. Its network capture and diagnostics ZIP features are not included in 0.1.9.

## 0.1.5

- Reworked the window layout and preserved the full-width embedded ChatGPT browser.
- Each cycle navigates to the ChatGPT home/new-chat route, verifies a fresh conversation and visible composer, then attempts Think, pastes the prompt, and submits.
- Think handling makes at most three attempts. The first failure refreshes the current blank chat; the second waits 30 seconds; the third failure continues without pausing rotation.
- Keeps the 20-second waits around prompt entry and the configurable post-submit interval.
- Adds persistent lifetime cycle counting.
