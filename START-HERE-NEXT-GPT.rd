> **源码导入已完成：0.1.12。** 源码 ZIP SHA-256 已核验，应用源码及测试已导入。
> 本次语法检查通过 11 个文件；自动测试结果：total=未解析, pass=未解析, fail=未解析。
> Windows 安装包尚未在本次脚本中构建；真实 ChatGPT 页面端到端检查仍需人工验证。见 docs/SESSION-HANDOFF.md。
# GPT Session Rotator 鈥?Next GPT Mandatory Handoff Prompt

> **Read this file first on every new conversation. Do not start coding until you have inspected the current GitHub repository state.**
> Repository: https://github.com/xiaobei206/GPT-Session-Rotator
> Default branch: `main`
> Current published source baseline: **0.1.12** (2026-11-07)

## Instructions to the next GPT

You are taking over an ongoing Windows Electron application project. The user expects you to continue development directly from the real repository, not reconstruct the project from chat memory. Treat the checked-in code and documents as the source of truth; this prompt only points you to them.

### Required first-pass inspection (do this in order)

1. Read this entire file.
2. Read `README.md`, `VERSION`, `package.json`, and the latest entries in `CHANGELOG.md`.
3. Read `docs/SESSION-HANDOFF.md`, `docs/PROJECT-ARCHITECTURE.md`, `docs/DEVELOPMENT-RULES.md`, `docs/TESTING-AND-RELEASE.md`, and the newest entry in `docs/DEVELOPMENT-LOG.md`.
4. Inspect `git status`, current branch, latest commit, and recent history. Fetch remote `main` before editing. Never assume local files or a prior assistant's claimed SHA are current.
5. Inspect relevant implementation and tests before changing behavior. The current test suite is `node --test` / `npm test` and needs no third-party packages.
6. Run the tests before editing to establish a baseline, then run tests and syntax checks again after editing.
7. Check open GitHub issues/PRs and the most recent commits if the connected tools make them available. Do not invent repository state if an endpoint is unavailable.

If you cannot access the repository or do not have write permission, report that blocker precisely. Do not claim that a change has been committed, tested, or built until a tool confirms it.

## Mission and user expectations

Keep GPT Session Rotator a lightweight, reliable automation utility. Preserve the existing working flow and UI unless the user explicitly approves a change. Prefer small, testable changes over architectural rewrites. The user prefers direct work and concrete artifacts, but honesty about tests and build limitations is mandatory.

### Product behavior to preserve

- Windows Electron app with an embedded ChatGPT browser, optional proxy settings, a fixed prompt, optional Think selection, automatic new-conversation cycling, and a user-configurable manual maximum wait.
- Existing automation sequence and retry behavior in `src/main.cjs` must be preserved unless a demonstrated bug requires a minimal targeted fix.
- GitHub early rotation watches `main` of `xiaobei206/padavan-4.4-2`. Poll every **90 seconds**; quiet threshold defaults to **15 minutes** and is configurable from **1鈥?80 whole minutes**. Setting is stored in the app's user-data `settings.json` and changes apply during an active run. A commit that already existed when automation started is only a baseline and must not trigger rotation. GitHub timing uses the response `Date` header; failures must not trigger or pause the normal manual timer.
- Conversation-length detection checks only the rendered ChatGPT main conversation area, not sidebar/navigation/out-of-main portals. Support Chinese/Traditional Chinese/English variants and red text or red frame/background evidence. A matching warning must stay continuously detected for **5 seconds**, regardless of where in the main area's scroll content it appears.
- Assistant-completion detection defaults to the marker `缁撴潫浠诲姟绠€鎶. It may inspect only the **new assistant reply added after the current cycle's submission baseline**. It must not match user prompt text or an old assistant message. A marker match may rotate only after generation has ended and stability confirmation succeeds. The marker is user-configurable while running; an empty value disables this trigger.
- Any confirmed early-rotation condition enters the existing next-cycle flow. The configured manual maximum wait remains a fallback. Page/GitHub detection failures must not create an unexplained pause.
- Lightweight privacy is intentional: inspect the assistant text in memory for marker matching only; do not persist or log assistant response bodies. Do not restore CDP network capture, page-body capture, API request/response-body capture, SSE/WebSocket payload recording, diagnostic-session directories, or diagnostic ZIP export.
- Manual wait presets include 40 minutes and do **not** include a 60-minute preset. Existing custom minutes entry remains.

## Non-negotiable development rules

1. **Version every formal application change.** Increment `package.json`, `VERSION`, UI version display, and release/changelog metadata consistently. Do not ship `FIX`, `FIX1`, or a changed executable under an unchanged version. For a normal bug-fix release after 0.1.12, use `0.1.13`; choose another SemVer increment only when justified and documented.
2. **Every code-changing Git commit must update `docs/DEVELOPMENT-LOG.md` in the same commit.** Include date, version, scope, root cause/problem, changed files/modules, tests actually run/results, build state, limitations, and next action. Use commit messages from `docs/DEVELOPMENT-RULES.md`.
3. Keep `CHANGELOG.md` user-facing and `docs/DEVELOPMENT-LOG.md` engineering-facing; update both for app releases. Keep `docs/SESSION-HANDOFF.md` current after material changes.
4. Add focused regression tests for bug fixes. Never remove a failing test just to make CI green. If a behavior cannot be covered by a pure unit test (real ChatGPT UI, Electron session, proxy, Windows packaging), clearly label it as requiring manual verification.
5. Run `npm test` and JavaScript syntax checks before committing. Build the Windows installer on a suitable Windows environment or clearly state that it was not built. Do not describe unit tests as an end-to-end test.
6. Inspect `git diff` and `git status` before committing. Do not force-push, rewrite published history, or silently overwrite unrelated changes. Never use `git add .` blindly if generated or user files are present.
7. Do not commit credentials, cookies, profiles, local `settings.json`, node_modules, build output, logs containing prompts or assistant reply text, test secrets, or diagnostic captures.
8. Keep documentation and test files in the same commit as the implementation. Do not claim GitHub Actions passed until its run is actually read and its conclusion is successful.
9. If an implementation detail is unclear, inspect the actual code and tests. Do not guess from old conversation summaries or infer that a prior assistant's claimed artifact/commit exists.
10. After each successful push, read the remote `main` head and confirm the changed key files are present. Provide the commit SHA, tests, packaging status, and any manual test still needed.

## Repository map

- `src/main.cjs`: Electron main process, application lifecycle, automation cycle, wait scheduling, GitHub/assistant/length trigger integration, IPC handlers.
- `src/preload.cjs`: constrained IPC bridge from renderer.
- `src/renderer.js`, `src/index.html`, `src/style.css`: user interface and settings.
- `src/github-monitor.cjs`: GitHub SHA baseline/quiet-threshold logic.
- `src/assistant-completion.cjs`: assistant reply marker recognition and browser-side scanner.
- `src/conversation-limit.cjs`: Chinese/English conversation-limit recognition, main-area scan, 5-second confirmation.
- `src/settings.cjs`: validation and persistence of user settings.
- `tests/*.test.cjs`: built-in Node test suite.
- `CHANGELOG.md`: user-facing behavior changes by release.
- `docs/DEVELOPMENT-LOG.md`: chronological engineering ledger; append every code-changing commit.
- `docs/SESSION-HANDOFF.md`: current state, known gaps, next recommended tasks.
- `docs/PROJECT-ARCHITECTURE.mdd: component boundaries and flow.
- `docs/TESTING-AND-RELEASE.md`: verification and Windows packaging checklist.

## Current baseline at handoff

- Version: `0.1.12`.
- Core automated tests: 32 passing in the initial source baseline (`node --test tests/*.test.cjs`). Re-run them from the current checkout; this number is historical until confirmed on the current commit.
- Windows NSIS installer: not verified by the source-baseline authoring environment because Electron/electron-builder dependencies were not installed there. Do not mark packaging as passed without a real build.
- `package-lock.json` is absent in the baseline. Evaluate and generate it only with a functioning npm/network environment; if added, commit it and update the ledger. Until then, CI should not use `npm ci`.
- This repository's first import may contain setup/handoff documentation commits before the source-import commit. Always inspect `git log` to understand actual history.
- Real logged-in ChatGPT UI behavior has not been confirmed end-to-end for every selector/layout. Unit tests cover intended decision logic, not live ChatGPT Markup.

## Required response after taking over

Once repository inspection is complete, begin with a concise status based on actual evidence: current branch/HEAD, version, tests run, build status, and next concrete task. Then continue the user's requested work. Do not repeat questions already answered in repository documents. Keep the handoff documents updated as development proceeds.
