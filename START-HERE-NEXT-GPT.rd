# GPT Session Rotator — 下一轮 GPT 必读交接指令

> 更新日期：2026-11-07
> 仓库：https://github.com/xiaobei206/GPT-Session-Rotator
> 默认分支：`main`
> 应用版本：`0.1.12`

## 当前状态先看这里

- 应用源码和 `tests/` 已由用户导入并推送到 `main`。源码导入提交：`fc22749d8f35f2ff9464605cbbb73df1098a64a3`。
- 当前交接文档用于修正导入后遗留的状态记录。先前脚本曾留下字面量 `$ExpectedHash` 和无法解析的测试计数；不要把这些占位符当成验证结果。
- 当前远程 `main` 的 0.1.12 源码已逐文件与源包核对：17/17 个源文件及应用元数据与导入提交一致。Node.js v22.16.0 下 `npm test`：32 项通过、0 失败；`node --check`：11 个 JS/CJS 文件全部通过。源码清单已修正为仓库根目录相对路径并通过 17 项 SHA-256 校验。Windows 安装包尚待 Actions Runner 构建；ChatGPT 实机验证仍待人工进行。
- 源码归档的预期 SHA-256：`c6596bebd32ad13124f2dddd8374929bc4c555d248836f2b6d37ac553aab92df`。

## 每次接手必须做的事

1. 先读完本文件，再读 `README.md`、`VERSION`、`package.json`、`CHANGELOG.md`。
2. 阅读 `docs/SESSION-HANDOFF.md`、`docs/PROJECT-ARCHITECTURE.md`、`docs/DEVELOPMENT-RULES.md`、`docs/TESTING-AND-RELEASE.md`、`docs/SOURCE-IMPORT-STATUS.md` 和最新的 `docs/DEVELOPMENT-LOG.md`。
3. `git fetch origin`，检查 `git status --short --branch`、`git log -8 --oneline --decorate` 和远程 `main`。以当前 Git 内容为准，不依赖旧对话中记忆的 SHA。
4. 在修改代码前，从当前检出目录运行 `npm test`，并执行各 JavaScript/CJS 文件的 `node --check`。如环境、依赖或命令导致无法执行，记录原始错误，不要猜测结果。
5. 修改后重新跑相关测试与语法检查，检查 `git diff --check`、`git diff` 和 `git status`。打包需在合适的 Windows 环境实际执行 `npm run dist:win`。
6. 查阅当前 CI/Actions 状态（若存在），不得只凭提交成功就称测试或 CI 通过。
7. 开发、测试、发布规则和交接状态须与相应代码一起更新；推送后确认远程 `main` 和关键文件。

## 项目目标与必须保留的行为

- Windows Electron 应用：在嵌入式 ChatGPT 页面中循环开启新对话、可选 Think、粘贴固定提示词并提交；手动等待时间始终是最大等待时间和兜底。
- GitHub 提前轮换监控 `xiaobei206/padavan-4.4-2` 的 `main`：每 90 秒轮询，默认静默阈值 15 分钟，可设置为 1–180 的整数分钟。启动时已存在的 SHA 只建立基线，不得立即触发。年龄以 GitHub 响应的 `Date` 头计算。请求失败不得触发提前轮换，也不得暂停手动计时。
- 助手完成标记默认是 `结束任务简报`，可在运行中修改；留空则禁用。仅检查当前提交提示词之后新增的助手回复，不能把用户提示词或旧回复当作命中。命中后还须确认生成已停止，并在后续轮询中保持稳定。
- 对话长度警告仅在 ChatGPT 主对话内容区内识别，支持简体中文、繁体中文和英文；红色文字、红色边框或红色背景可作为证据。即使警告在当前滚动视口之外，也必须能够识别；同一警告须连续确认 5 秒。
- 手动等待预设包含 40 分钟、不包含 60 分钟；保留自定义分钟数输入。
- 发生任何提前轮换后，都进入既有的新一轮流程；GitHub 或页面探测失败不能产生莫名暂停。

## 隐私边界

- 助手回复文本仅允许在内存中用于完成标记匹配，不得保存或写入日志。
- 不得重新加入 CDP 网络捕获、页面正文存档、API 请求/响应正文、SSE/WebSocket 负载记录、诊断会话目录或诊断 ZIP 导出。
- 不提交 cookies、浏览器个人资料、Token、密码、本地 `settings.json`、`node_modules/`、`dist/` 或含提示词/回复正文的日志。

## 版本与提交约束

- 每次正式应用行为变更都要同步更新 `package.json`、`VERSION`、`src/index.html` 的版本显示、`CHANGELOG.md` 和 `docs/DEVELOPMENT-LOG.md`。0.1.12 之后的常规修复版本通常应为 `0.1.13`。
- 每个代码或开发流程变更提交，必须在同一提交中更新 `docs/DEVELOPMENT-LOG.md`；说明原因、文件、实际测试结果、打包状态、限制和后续事项。
- 不删除失败测试来让结果变绿；不伪造测试/打包结果；不创建虚假的 `package-lock.json`；不强推，不重写已发布历史，不盲目 `git add .`。
- 文档中如有脚本占位符、未解析的统计或未经核实的断言，必须明确标注或修复，不能让下一轮 GPT 将其当成事实。

## 关键文件

- `src/main.cjs`：Electron 主进程、自动化循环、计时、IPC 与轮换触发器整合。
- `src/preload.cjs`：受限 IPC 桥接。
- `src/renderer.js`、`src/index.html`、`src/style.css`：设置、控制和界面。
- `src/github-monitor.cjs`：GitHub SHA 基线、提交静默时间和阈值。
- `src/assistant-completion.cjs`：新增助手回复与完成标记判断。
- `src/conversation-limit.cjs`：主对话区域的长度警告识别及五秒确认。
- `src/settings.cjs`：设置验证与持久化。
- `tests/*.test.cjs`：Node 内置测试运行器测试。
- `docs/DEVELOPMENT-LOG.md`：按时间顺序记录开发历史。
- `docs/SESSION-HANDOFF.md`：当前状态、风险和下一步。

## 给下一轮 GPT 的首要任务

当前已完成本地测试与语法检查。下一步检查本提交触发的 GitHub Actions Windows 构建；若测试和安装包构建均成功，Release job 将发布 `v0.1.12` 并附上 NSIS 安装程序。随后再进行真实 ChatGPT 页面验证。不要因为源码已经推送就推断这些验证已完成。

每次接手后先简洁汇报实际确认的分支/提交、版本、测试状态、打包状态和下一项具体工作，然后继续推进，不要重复询问文档中已有答案。

## Windows Actions 环境补充

- 第一轮 Actions `42388131374` 在 SemVer 正则校验失败，原因是 workflow 正则反斜杠转义过多；尚未进入依赖安装。
- 第二轮 Actions `42388205169` 通过版本校验，但在 `.gitignore` 的 SHA-256 检查发现 Windows checkout 将 LF 转为 CRLF，尚未进入依赖安装。
- 已添加 `.gitattributes`：`* text=auto eol=lf`，并把该文件纳入根目录相对源码清单。工作流现按 SHA 清单字段定长解析；新的第三轮运行将再次验证完整链路。
- 不要把前两次工作流失败认作应用单元测试失败；两次均在安装依赖和运行测试之前终止。
