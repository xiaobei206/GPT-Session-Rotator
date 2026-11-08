# Project Architecture

## Scope

GPT Session Rotator is a lightweight Windows Electron utility that embeds ChatGPT and automates repeated work cycles. The project intentionally avoids network-body diagnostics and does not persist assistant response text.

## Runtime components

### Main process — `src/main.cjs`

Responsibilities:
- Create and manage the Electron window and embedded ChatGPT browser session.
- Maintain run state and cycle number.
- Execute the existing new-chat → readiness checks → optional Think attempts → paste prompt → submit → wait sequence.
- Coordinate the manual maximum wait with early-rotation sources.
- Own IPC handlers for dynamic settings and app lifecycle.
- Emit short human-readable run events without logging assistant response bodies.

The `executeCycle()` function is the main loop entry point. Confirm the current implementation before altering cycle sequencing; preserve its established failure fallback behavior.

### Preload bridge — `src/preload.cjs`

Expose only the small, explicit IPC API needed by the renderer. Keep context isolation and do not expose unrestricted Electron or Node APIs to page content.

### Renderer UI — `src/renderer.js`, `src/index.html`, `src/style.css`

Responsibilities:
- Prompt and proxy configuration UI.
- Manual wait selection/custom minutes.
- GitHub quiet-threshold setting (default 15 minutes; 1–180 whole minutes).
- Assistant-completion marker setting (default `结束任务简报`; blank disables it).
- On-screen event log and status display.
- dynamic setting updates while a run is active.

Keep UI changes minimal and update the displayed version on every formal app release.

### GitHub monitor — `src/github-monitor.cjs`

- Reads only the latest public commit on `main` of `xiaobei206/padavan-4.4-2`.
- Uses the embedded Electron session so configured proxy routing applies.
- Poll interval: 90/120/150/180 seconds (default 90 seconds) without a token; 30 seconds is enabled only while an optional GitHub token is configured and has not been rejected. The setting persists and reschedules the active wait's next poll immediately without cancelling an in-flight request.
- Optional token is sent only as a Bearer header on the latest-commit endpoint. Plaintext remains in the main process only. Persistence uses Electron safeStorage ciphertext; Windows uses DPAPI. HTTP 401 marks the token rejected, stops sending it, and returns cadence to 90 seconds.
- Threshold: 15 minutes by default; normalized to an integer from 1 through 180 minutes.
- Startup SHA is a baseline, never a trigger. Only a SHA that appears after that baseline can become a candidate.
- Uses a valid GitHub HTTP `Date` header for time calculation. Missing/bad headers, malformed commits, HTTP errors, and fetch errors cannot trigger early rotation.
- A newer SHA resets the quiet-time candidate. Changing the threshold during a run re-evaluates the latest valid observation immediately. Changing the polling interval while running reschedules the next check using the selected cadence; transient HTTP 502 responses remain non-triggering failures.
- The monitor does not download repository files or inspect diffs.

### Assistant completion — `src/assistant-completion.cjs`

- Default marker: `结束任务简报`.
- Takes the pre-submit assistant-message baseline for each cycle, including stable IDs and IDs of nodes that were empty at baseline.
- Allows an empty pre-submit assistant placeholder to become eligible if ChatGPT fills it after submission; populated pre-existing assistant messages and the user prompt remain excluded.
- Scans assistant message nodes inside the main conversation area only.
- Inspects response text in memory only; never logs or persists full message text.
- Requires the marker in a new assistant reply and evidence that generation has stopped; stability confirmation prevents a partially generated answer from triggering.
- Setting is saved in app user-data `settings.json` and is updated live. Empty marker disables the trigger.

### Conversation limit — `src/conversation-limit.cjs`

- Uses a browser-side DOM scan, constrained to the main conversation region.
- Scans rendered nodes across the main region regardless of whether they are within the currently visible viewport, so a warning below the scroll position is not excluded merely for being off-screen.
- Matches common Chinese, Traditional Chinese, and English conversation-length wording variants.
- Requires red text or red-frame/background evidence; generic alerts, quota notices, user messages about length, sidebar/navigation controls, and out-of-main portals must not be misclassified.
- The same warning must persist for five seconds. Disappearance, content changes, or an excessive observation gap reset confirmation.
- Does not click “New chat” or other page controls directly.

### Settings — `src/settings.cjs`

Persist validated application settings to the user's app data path (`settings.json`). The optional GitHub token is stored only as an Electron safeStorage-encrypted value (Windows DPAPI), never as plaintext. Settings writes should be small, atomic where practical, and restricted to the values needed by the app. Do not store cookies, prompts beyond existing explicit app configuration policy, assistant responses, page dumps, or diagnostic traces in the new settings file.

## Automation decision order

During the post-submit wait, the main process coordinates:
1. A new assistant reply containing the configured completion marker, after generation ends and confirmation succeeds.
2. A confirmed five-second main-area conversation-length warning.
3. A qualifying post-start GitHub SHA reaching the configured quiet threshold.
4. The configured manual maximum wait as the unconditional fallback.

The earliest valid trigger should end the current wait and enter the existing next-cycle flow. Detection failure must not pause the loop indefinitely. Verify actual order and cancellation semantics in `src/main.cjs` before modifying it.

## Privacy and non-goals

- Do not reintroduce always-on CDP capture, page body snapshots, network request/response bodies, SSE/WebSocket capture, diagnostic directories, or diagnostic ZIP export.
- Do not log full assistant response text. Minimal marker, reason, cycle and elapsed-time metadata are enough.
- This app is not a general browser agent; avoid unrelated scraping or hidden telemetry.
- Unit tests validate decision logic. They do not guarantee ChatGPT's selectors will remain unchanged; live UI verification remains a separate release check.


## ChatGPT assistant app-shell scanner — v0.1.15

The completion detector first selects an active app timeline/transcript/conversation root and supports both the legacy assistant-role attribute and the current app-shell assistant markdown marker \`data-markdown-text-style="assistant-message"\`. It uses stable turn/content-search keys as message IDs. The browser-side snapshot reports only selector hit counts, selected root, candidate/visibility counts and generation-state flags; page or reply text is never written to logs. A short-lived in-memory text signature is part of completion stability confirmation, so any continued response growth restarts the confirmation window.
