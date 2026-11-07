# Contributing / Continuing Development

Before making changes, read [`START-HERE-NEXT-GPT.rd`](START-HERE-NEXT-GPT.rd). It is the required handoff prompt for every new GPT session and summarizes the development contract.

Then read:

- [`docs/DEVELOPMENT-RULES.md`](docs/DEVELOPMENT-RULES.md) — versioning, commit policy, privacy and safe Git workflow.
- [`docs/PROJECT-ARCHITECTURE.md`](docs/PROJECT-ARCHITECTURE.md) — component responsibilities and rotation triggers.
- [`docs/SESSION-HANDOFF.md`](docs/SESSION-HANDOFF.md) — current baseline, known limitations and next checks.
- [`docs/TESTING-AND-RELEASE.md`](docs/TESTING-AND-RELEASE.md) — commands and release checklist.
- [`docs/DEVELOPMENT-LOG.md`](docs/DEVELOPMENT-LOG.md) — append-only engineering history.

Every code-changing commit must include a detailed engineering log entry in `docs/DEVELOPMENT-LOG.md`. Application releases also update `CHANGELOG.md`, version metadata and regression tests. Do not commit private user data, credentials, logs of assistant replies, or network-body diagnostics.
