# Testing and Release Checklist

## Fast local test pass (no external npm packages required)

From repository root with a supported Node.js installation:

```powershell
node --check src/main.cjs
node --check src/preload.cjs
node --check src/renderer.js
node --check src/settings.cjs
node --check src/github-monitor.cjs
node --check src/assistant-completion.cjs
node --check src/conversation-limit.cjs
npm test
```

The test suite uses Node's built-in test runner and should not need an Electron install. `npm test` invokes `node --test`.

## Regression areas

- Assistant marker defaults, normalization, disable behavior, and UI-configurable persistence.
- A new assistant reply after submit can trigger; an empty assistant placeholder present at baseline can trigger only after it is populated; populated old assistant messages and user-prompt echoes cannot.
- Marker detection does not confirm while ChatGPT is still generating; a stable post-generation poll is required.
- Main-area scanning only; content below the viewport does not get rejected by a viewport-only visibility check.
- Chinese/Traditional Chinese/English conversation-length wording; red text or red frame evidence; no false positives for usage quotas, oversized user prompts, or sidebar controls.
- Length warning needs five continuous seconds; warning disappearance, changes, and long observation gaps reset the timer.
- GitHub polling offers 90/120/150/180 seconds without a token and additionally 30 seconds only when authenticated; default is 90 seconds. Invalid or unauthenticated 30-second choices are rejected.
- Authenticated commit requests add a Bearer header; unauthenticated requests do not. Token persistence uses safeStorage encryption, never plaintext settings; unavailable encryption fails closed. Token clearing and HTTP 401 fallback return polling to 90 seconds.
- Token save/clear IPC results use the same `githubTokenConfigured` / `githubTokenRejected` keys as the initial status query, so the 30-second option, clear button, and status label update immediately.
- Unchanged successful polls emit a `GitHub轮询检查` heartbeat with short SHA, GitHub-Date-based commit age, monitor state, auth mode, and threshold; neither Token nor commit body may enter the log.
- Changing the poll interval reschedules the active poll cadence. Quiet-threshold default/range and immediate re-evaluation are also checked.
- Existing SHA at startup is baseline only; new SHA is eligible; GitHub Date is required; failed requests do not trigger; next SHA resets candidate.
- Repository setting accepts `owner/repo`, full GitHub URLs, and `/commits/main` page URLs; invalid/non-GitHub URLs are rejected and the setting persists across launches.
- The normal commit poller and startup Actions gate both construct API URLs from the same repository setting. A live repository change resets the new target's SHA baseline and stale results from an old request cannot rotate the session.
- Settings persist and invalid values are rejected.

## UI layout regression checks

- The Start, Stop, Refresh GPT, and prompt-shortcut controls must remain outside the scrollable settings container.
- Proxy, Think, GitHub settings, completion marker, and the fixed prompt must remain inside the independent settings scroll region.
- The settings region must use vertical scrolling with `min-height:0` in its flex layout; the fixed prompt must be resizable and the shortcut must scroll/focus it.
- Small panel heights must not reduce the prompt below its minimum editable height or hide the fixed action toolbar.

## Windows installer build

On Windows with network access and npm configured:

```powershell
npm install
npm test
npm run dist:win
```

Expected NSIS output should be in `dist/` with a name matching the current `package.json` version, such as `GPT Session Rotator-0.1.16-Setup.exe`. Confirm the actual artifact name from build output; do not assume it exists.

Perform a clean install/launch test and, for an upgrade test, verify that application user data (including the embedded ChatGPT session and counters) is not inadvertently erased. Do not include user data or settings in the installer package.

## Release checklist

- [ ] Reproduce the target defect and document its root cause.
- [ ] Add/update regression tests.
- [ ] Increment `package.json`, `VERSION`, UI version display, startup version string, and `CHANGELOG.md` consistently for app releases.
- [ ] Update `README.md` and `docs/SESSION-HANDOFF.md` if behavior/status changes.
- [ ] Append a complete `docs/DEVELOPMENT-LOG.md` entry in the same commit.
- [ ] Regenerate `SOURCE-MANIFEST.sha256` from repository-root-relative files.
- [ ] Run all syntax checks, `npm test`, `git diff --check`, and review the diff.
- [ ] Build Windows NSIS package in a suitable environment and record the exact result; if not done, state this explicitly.
- [ ] Verify the GitHub Actions run if CI is configured.
- [ ] Push non-forcefully, then verify remote `main` SHA and key files.
- [ ] Manually run the app against ChatGPT for completion marker, length warning, and fallback behavior.
- [ ] Keep the log truthful about what was and was not tested.


## Startup GitHub Actions gate

- Starting automation checks queued/active workflow runs whose head branch is `main` in `xiaobei206/padavan-4.4-2`. Workflow statuses `queued`, `in_progress`, `waiting`, `pending`, and `requested` block a new ChatGPT cycle; completed runs do not block regardless of conclusion.
- Recheck every 60 seconds. The gate timeout is the same duration selected as the maximum-wait interval when Start is pressed. A timeout or repeated API failure logs a warning and proceeds; the gate must never loop indefinitely.
- Stop cancels the gate. A stopped gate must not launch the first cycle, even if its previous API request completes later.
- Each Actions API request has a 15-second timeout. If an optional PAT lacks Actions permission, retry the public repository request without authentication rather than treating the PAT as invalid.
- Test the no-active-runs fast path, active-run filtering by main branch/status, active-to-completed release, hard deadline on stuck runs/API errors, and Stop cancellation. Logs may include workflow name, run ID/status and short SHA only; never include commit titles/bodies, tokens, or response payloads.
