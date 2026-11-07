# Development Rules and Git Workflow

## Change sizing

1. Reproduce and understand the current behavior before editing.
2. Find the responsible module and tests; prefer a minimal, isolated patch.
3. Keep the automation sequence and existing controls stable unless the user explicitly requests a change or a proven defect requires it.
4. Add a regression test first when practical, then implement the fix.
5. Avoid new runtime dependencies for pure logic when Node's built-in APIs are sufficient.
6. Keep response-content inspection in memory and avoid collecting personal/work data in logs.

## Release and version synchronization

For every formal app behavior change, increment `package.json.version`, `VERSION`, and the version text in `src/index.html` and startup UI/log text where applicable. Add a dated `CHANGELOG.md` entry and an engineering entry in `docs/DEVELOPMENT-LOG.md`. Keep README behavior descriptions accurate. Rebuild `SOURCE-MANIFEST.sha256` after changes; it must use paths relative to the repository root, not a parent directory name from an export archive.

Use SemVer intentionally:
- Patch: backwards-compatible bug fix.
- Minor: backwards-compatible feature addition.
- Major: incompatible behavior or config/API change.

The next ordinary fix after 0.1.14 should normally be 0.1.15. Documentation/CI bootstrap commits that do not alter application behavior may keep the app version unchanged, but still need a development-log entry.

## Every commit must have a ledger entry

Every commit that changes project code or development workflow must modify `docs/DEVELOPMENT-LOG.md` in the same commit. A log entry should contain:

- Local date (`YYYY-MM-DD`) and app version (or `docs-only` / `CI-only`).
- Commit intent and user-visible effect.
- Root cause or reason for change.
- Files/modules changed.
- Tests/commands run and exact pass/fail result.
- Build/package state: passed, failed, or not run, with reason.
- Risks, manual checks still needed, and next action.

Never claim a test/build was run if it wasn't. When the commit SHA is not known until after commit creation, do not guess it or write a placeholder SHA into the same commit; the commit message and Git history identify the record.

## Commit message convention

Use a short imperative Conventional-Commit-style title plus a detailed body:

- `feat: add configurable assistant completion marker`
- `fix: detect length warnings outside viewport`
- `test: cover GitHub quiet-threshold baseline`
- `docs: add next-session handoff protocol`
- `ci: run Node regression suite`

The body should state **why**, **what changed**, **tests**, and **known limitations**. Do not use `fix1`, `latest`, `final2`, or other opaque version names.

## Safe Git sequence

1. `git fetch origin`
2. `git status --short --branch`
3. Inspect current branch and `git log -8 --oneline --decorate`.
4. Run tests before edits.
5. Make a focused change.
6. Run syntax checks, tests, and `git diff --check`.
7. Review `git diff` and check that no secrets, generated files, or assistant response content were added.
8. Update `CHANGELOG.md`, `docs/DEVELOPMENT-LOG.md`, `docs/SESSION-HANDOFF.md`, tests, and version metadata as applicable.
9. Commit only reviewed intended files; do not blindly run `git add .` in a dirty checkout.
10. Push without force. Fetch again and verify the remote commit and changed file paths.
11. Read GitHub Actions results before reporting CI status.

If the remote has advanced since the last read, reconcile before pushing. Never overwrite unrelated commits or force-push published history.

## Do not commit

- `node_modules/`, `dist/`, temporary ZIP extracts, test scratch directories, local logs, editor caches.
- Cookies, browser profiles, auth tokens, passwords, secret environment files.
- Assistant full response text, ChatGPT page bodies, API bodies, SSE/WebSocket payloads, diagnostic bundles.
- A user's private prompt contents unless the user explicitly asks to version that prompt as source.
- Machine-specific local `settings.json` or generated personal data.

## Documentation policy

- `START-HERE-NEXT-GPT.rd` is the single mandatory entry prompt for future GPT sessions.
- `CHANGELOG.md` is user-facing release history.
- `docs/DEVELOPMENT-LOG.md` is append-only engineering history; do not rewrite older entries to hide a failure.
- `docs/SESSION-HANDOFF.md` is the current state snapshot; update it when the next task, known blocker, or release state changes.
- `docs/PROJECT-ARCHITECTURE.md` explains module boundaries and data flow.
- `docs/TESTING-AND-RELEASE.md` explains repeatable checks and Windows packaging.
- PRs should follow `.github/pull_request_template.md` and include a log entry.
