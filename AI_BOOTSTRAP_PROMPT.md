<!-- Current project handoff override: 2026-11-08 -->

## Current implementation state

- Latest published release remains v0.2.2 until v0.2.3 CI validation and the formal release workflow are confirmed.
- v0.2.3 adds a startup gate for queued/active GitHub Actions runs on `xiaobei206/padavan-4.4-2/main`: every 60 seconds, with the configured maximum-wait interval as the hard deadline, Stop cancellation, and fail-open behavior on timeout/API errors.
- The commit baseline is established only after the startup gate resolves. The gate logs workflow name, Run ID/status and short SHA only; it never logs Token values or commit titles/body.
- v0.2.2 final Actions run `42487228051` succeeded with 46 tests, 13 JS/CJS syntax checks, 20 manifest entries, Windows x64 NSIS build/upload and official Release publication.
- v0.2.3 Actions, Windows packaging and formal release must be confirmed live. Real Windows DPAPI/PAT and signed-in ChatGPT end-to-end checks remain manual.

# AI Bootstrap Prompt — GPT Session Rotator

> 给新对话的最短接手入口。更新日期：2026-11-08。仓库状态、版本、Actions 和 Release 都必须在接手时重新核实，不要把本文件中的快照当成永远最新。

## 仓库与接手规则

- 仓库： https://github.com/xiaobei206/GPT-Session-Rotator
- 默认分支：`main`。这是个人项目；在确认工作区和远程状态安全后，优先直接维护 `main`，不要无必要地拆出大量分支/PR。禁止强推、重写已发布历史或盲目覆盖远程变化。
- 用户可能只说“请接手这个项目继续开发”。不要因此只给建议：先调查当前状态，再实际推进最明确的待办；文档已有答案时不要重复询问。
- 先确认当前 `main` HEAD、最新应用版本、Release、最近一次相关 GitHub Actions run、测试与打包结果。以实时远程内容为准，不依赖任何旧对话或过时 SHA。
- 依次阅读 `README.md`、`START-HERE-NEXT-GPT.rd`、`docs/SESSION-HANDOFF.md`、`docs/DEVELOPMENT-RULES.md`、`docs/PROJECT-ARCHITECTURE.md`、`docs/TESTING-AND-RELEASE.md` 和 `docs/DEVELOPMENT-LOG.md` 最新条目。旧版本事故和历史状态只用来了解背景，不能当作当前验证结果。
- 在改代码前运行 `npm test`，并对相关 `.js`/`.cjs` 运行 `node --check`；修改后再次验证，检查 `git diff --check`、完整差异、工作区和远程 HEAD。当前仓库没有 `package-lock.json` 时不要运行 `npm ci`，也不要伪造锁文件。
- 只有在实际查看过 Actions 结果后才能说 CI 通过；只有在实际 Windows 环境构建后才能说本地 Windows 打包通过。没在真实 ChatGPT 登录态中实测时，必须明确标记为未完成端到端验证。

## 当前已知基线（接手时须复核）

- 最新正式版本仍为 v0.2.2；v0.2.3 是加入启动前 Actions 门禁的待验证版本。
- v0.2.2 最终 Actions run `42487228051` 成功：46/46 测试、13 项 JavaScript/CJS 语法、20 项 SHA-256 manifest、Windows x64 NSIS 构建与正式 Release 全部成功。
- v0.2.3 的启动门禁必须在 Start 时检查 `xiaobei206/padavan-4.4-2/main` 上排队/运行中的 Actions，60 秒复查，停止可取消，超时等于当前设置的最长等待时间；超时或请求失败要继续启动，不得无限等待。
- v0.2.3 的 Windows Actions、安装包和正式 Release 状态必须实时核验；不得宣称本机 DPAPI、真实 PAT 权限或 ChatGPT 登录态端到端验证已完成。

## 不可破坏的功能和隐私边界

- 自动化在嵌入式 ChatGPT 页面中新建对话、可选 Think、粘贴固定提示词并提交；手动等待始终是最长等待的兜底。
- GitHub 提前轮换监控 `xiaobei206/padavan-4.4-2` 的 `main`，未配置 Token 时轮询间隔可选 90/120/150/180 秒，已保存且未被拒绝的 Token 还可选择 30 秒；运行中即时生效。启动时现有 SHA 仅建立基线；静默阈值以当前设置为准。探测失败不能触发轮换，也不能暂停手动计时。每次成功查询会留下不含 Token/commit 正文的状态日志。
- 助手完成标记只允许检测当前轮提交相关的助手回复；旧的、提交前已有正文的助手消息不能触发。命中之后须确认生成停止且消息正文不再变化。空标记表示禁用该条件。
- 对话长度警告仅在主对话区域识别，连续确认 5 秒；不得把普通提示、侧栏或无关警报误认为长度警告。
- 助手回复正文只可在进程内用于标记/稳定性判断，不能写日志、保存或上传。不得恢复 CDP 网络捕获、页面正文存档、API 请求/响应正文、SSE/WebSocket 负载记录或诊断 ZIP。
- 每次应用行为变更同步更新 `package.json`、`VERSION`、界面版本、启动日志、`CHANGELOG.md`、`README.md`、必要文档、测试和 `docs/DEVELOPMENT-LOG.md`；按仓库现行规则更新 `SOURCE-MANIFEST.sha256`。版本必须递增，不得发布 FIX/覆盖旧 tag。

## 关键文件

- `src/main.cjs`：主进程、自动化循环、计时与触发器整合。
- `src/assistant-completion.cjs`：助手结束标记与稳定性检测。
- `src/conversation-limit.cjs`：对话长度警告检测。
- `src/github-monitor.cjs`：GitHub SHA 基线和静默时间。
- `src/settings.cjs`、`src/preload.cjs`、`src/renderer.js`、`src/index.html`、`src/style.css`：配置、IPC 和界面。
- `tests/*.test.cjs`：回归测试；`docs/DEVELOPMENT-LOG.md`：按时间保留完整历史；`docs/SESSION-HANDOFF.md`：当前待办和验证状态。

## 接手后第一条回复

先简洁报告你实际核实的 `main` SHA、应用版本/最新 Release、最新 Actions 结论、测试状态和未完成的端到端验证，然后直接开始处理最明确的下一项工作。不要只说“已接手”，也不要承诺后台以后再做。
