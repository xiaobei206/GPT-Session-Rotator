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
- GitHub polling remains 90 seconds; threshold default and range are correct; threshold changes are immediate.
- Existing SHA at startup is baseline only; new SHA is eligible; GitHub Date is required; failed requests do not trigger; next SHA resets candidate.
- Settings persist and invalid values are rejected.

## Windows installer build

On Windows with network access and npm configured:

```powershell
npm install
npm test
npm run dist:win
```

Expected NSIS output should be in `dist/` with a name similar to `GPT Session Rotator-0.1.14-Setup.exe`. Confirm the actual artifact name from build output; do not assume it exists.

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
