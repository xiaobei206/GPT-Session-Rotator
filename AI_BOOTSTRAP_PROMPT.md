<!-- Current project handoff override: 2026-11-08 -->

## Current implementation state

- Latest published baseline: v0.2.0. Active work targets v0.2.1 to fix the left settings panel clipping its lower content and prompt field.
- Root cause confirmed: `.controls` used `overflow:hidden` in a fixed 330px dashboard panel; the prompt textarea was only 50px high and no inner vertical scroll region existed.
- Target UI: fixed toolbar for wait settings and Start/Stop/Refresh/Prompt actions; independent vertical scrolling for the remaining settings and prompt; larger resizable prompt editor plus a prompt jump/focus button.
- Add UI layout regression tests. Keep every button and input ID/IPC behavior stable. Increment all version metadata and update README, CHANGELOG, source SHA-256 manifest and dated development log.
- Never report a new release until the new Actions run passes manifest validation, all tests, JavaScript syntax checks, Windows x64 NSIS build and artifact upload, followed by the separate `[release]` trigger and successful GitHub Release verification.

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

- 最新已知正式版为 `v0.1.15`；Release： https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.15
- 对应最终成功的 Actions run 为 `42400753265`：38/38 测试通过、11/11 个 JS/CJS 语法检查通过、18 项源码 SHA-256 清单通过，Windows x64 NSIS 构建及 Release 发布成功。
- v0.1.15 修复新版 ChatGPT app-shell 助手节点识别，并加入 selector 命中计数和正文稳定性复核；但**没有**在用户真实 Windows + ChatGPT 登录态中完成人工端到端验证。
- 当前开发项：0.1.16 新增 GitHub API 查询间隔下拉菜单，选项 90/120/150/180 秒，默认 90 秒；运行中选择会调整后续轮询。先检查本次 Actions 和 Release 再汇报。
- 用户此前反馈把助手结束标记设为 `本轮完成` 后未触发下一轮。真实 Windows + ChatGPT 登录态端到端验证仍未完成；不要把单元测试通过说成现场问题已经解决。
- 相关日志可能出现 `结束回显扫描`、`结束回显节点发现`、`结束回显节点诊断`、`任务结束回显`。可请用户只提供这些不含回复正文的状态日志；不要要求上传完整聊天正文、cookies、个人资料或网络请求/响应正文。

## 不可破坏的功能和隐私边界

- 自动化在嵌入式 ChatGPT 页面中新建对话、可选 Think、粘贴固定提示词并提交；手动等待始终是最长等待的兜底。
- GitHub 提前轮换监控 `xiaobei206/padavan-4.4-2` 的 `main`，轮询间隔可选 90/120/150/180 秒（默认 90 秒，运行中即时生效）。启动时现有 SHA 仅建立基线；静默阈值以当前设置为准。包括 HTTP 502 在内的探测失败不能触发轮换，也不能暂停手动计时。
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
