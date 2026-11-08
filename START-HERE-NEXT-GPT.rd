> **2026-11-08 当前开发状态（优先于下方历史交接记录）：** 当前目标版本 v0.2.0，基于已发布 v0.1.16，增加可选 GitHub Token 与 30 秒轮询。无 Token 时仅可选 90/120/150/180 秒；有效 Token 可开放 30 秒（约 120 次/小时）。Token 使用 safeStorage 加密，Windows DPAPI；HTTP 401 禁用 Token 并退回 90 秒。读取最新 Actions/Release，不得在正式 Release 成功前宣称交付。
>

# GPT Session Rotator — 下一轮 GPT 必读交接指令

> 更新日期：2026-11-08
> 仓库：https://github.com/xiaobei206/GPT-Session-Rotator
> 默认分支：`main`
> 源码版本：`0.1.16`（GitHub API 查询间隔下拉设置；本次 Actions 验证待完成）
> 最近正式安装包：`0.1.15`（Release 已正式发布）

> **接手顺序：** 新对话先读根目录 `AI_BOOTSTRAP_PROMPT.md` 获取当前任务与验证边界，再把本文件作为详细规程；本文件后半部分包含历史事故记录，历史状态不能覆盖实时 `main`、Actions 与 Release 结果。

## 当前状态先看这里

> **当前开发项：** 0.1.16 源码的 Actions run #17（42475629231）已成功：38/38 测试、11 个 JS/CJS 语法检查、18 项 SHA-256 清单以及 Windows NSIS 构建/工件上传均通过。当前正式 Release 仍为 v0.1.15；本次带 `[release]` 的提交会重新验证并触发 v0.1.16 发布。
>
> **保留待办：** v0.1.15 助手结束回显链路仍未在用户真实 Windows + ChatGPT 登录态中完成人工端到端验证。

- 应用源码和 `tests/` 已由用户导入并推送到 `main`。源码导入提交：`fc22749d8f35f2ff9464605cbbb73df1098a64a3`。
- 当前交接文档用于修正导入后遗留的状态记录。先前脚本曾留下字面量 `$ExpectedHash` 和无法解析的测试计数；不要把这些占位符当成验证结果。
- 已发布正式版：`0.1.13`；该版本 Actions run `42392748703` 完整成功：34 项测试、11 个 JS/CJS 语法检查、18 项源码 SHA-256 清单、Windows x64 NSIS 构建及 Release 上传均通过。
- v0.1.14 应用修复提交 `fa449d80b13af4b6c32435b6d3a78a15a5ca2b2c` 修复了提交前空助手占位节点被复用时漏检的问题；该版本历史验证为 36/36 测试通过。
- 当前应用版本升级为 `0.1.15`，应用修复提交 `37c4d728f335a194162f341c56a82ab95e110cc4`：兼容新版 ChatGPT app-shell 助手 Markdown 节点和活动时间线根节点，增加 selector hit / visibility 诊断；标记命中后用内存文本签名确认正文停止增长。测试/发布修正提交：`5628c96932cb063fe83a078ce7caf5d4aac320c9`（Windows 清单哈希）和 `dc7184d204ef4233e904fcbfb960cba657788a63`（回归测试断言）。
- Actions run `42400753265` 最终成功：38/38 测试、11/11 JS/CJS 语法检查、18 项源码 SHA-256 清单、Windows x64 NSIS 构建、工件上传和 Release 发布均通过。正式 Release：`https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.15`。
- 源码归档的预期 SHA-256：`c6596bebd32ad13124f2dddd8374929bc4c555d248836f2b6d37ac553aab92df`。

## 每次接手必须做的事

1. 已先阅读根目录 `AI_BOOTSTRAP_PROMPT.md` 后，再读完本文件及 `README.md`、`VERSION`、`package.json`、`CHANGELOG.md`。
2. 阅读 `docs/SESSION-HANDOFF.md`、`docs/PROJECT-ARCHITECTURE.md`、`docs/DEVELOPMENT-RULES.md`、`docs/TESTING-AND-RELEASE.md`、`docs/SOURCE-IMPORT-STATUS.md` 和最新的 `docs/DEVELOPMENT-LOG.md`。
3. `git fetch origin`，检查 `git status --short --branch`、`git log -8 --oneline --decorate` 和远程 `main`。以当前 Git 内容为准，不依赖旧对话中记忆的 SHA。
4. 在修改代码前，从当前检出目录运行 `npm test`，并执行各 JavaScript/CJS 文件的 `node --check`。如环境、依赖或命令导致无法执行，记录原始错误，不要猜测结果。
5. 修改后重新跑相关测试与语法检查，检查 `git diff --check`、`git diff` 和 `git status`。打包需在合适的 Windows 环境实际执行 `npm run dist:win`。
6. 查阅当前 CI/Actions 状态（若存在），不得只凭提交成功就称测试或 CI 通过。
7. 开发、测试、发布规则和交接状态须与相应代码一起更新；推送后确认远程 `main` 和关键文件。

## 项目目标与必须保留的行为

- Windows Electron 应用：在嵌入式 ChatGPT 页面中循环开启新对话、可选 Think、粘贴固定提示词并提交；手动等待时间始终是最大等待时间和兜底。
- GitHub 提前轮换监控 `xiaobei206/padavan-4.4-2` 的 `main`：轮询间隔可选 90/120/150/180 秒（默认 90 秒，运行中修改即时调整后续轮询），静默阈值默认 15 分钟，可设置为 1–180 的整数分钟。启动时已存在的 SHA 只建立基线，不得立即触发。年龄以 GitHub 响应的 `Date` 头计算。请求失败不得触发提前轮换，也不得暂停手动计时。
- 助手完成标记默认是 `结束任务简报`，可在运行中修改；留空则禁用。仅检查当前提交提示词之后新增的助手回复；提交前已存在但当时为空的助手占位节点，在提交后被填充时允许参与匹配；提交前已有正文的旧回复和用户提示词仍不得命中。扫描兼容旧版 role 属性和新版 `data-markdown-text-style="assistant-message"` app-shell DOM。命中后还须确认生成已停止、正文签名稳定，并在后续轮询中保持稳定。
- 对话长度警告仅在 ChatGPT 主对话内容区内识别，支持简体中文、繁体中文和英文；红色文字、红色边框或红色背景可作为证据。即使警告在当前滚动视口之外，也必须能够识别；同一警告须连续确认 5 秒。
- 手动等待预设包含 40 分钟、不包含 60 分钟；保留自定义分钟数输入。
- 发生任何提前轮换后，都进入既有的新一轮流程；GitHub 或页面探测失败不能产生莫名暂停。

## 隐私边界

- 助手回复文本仅允许在内存中用于完成标记匹配，不得保存或写入日志。
- 不得重新加入 CDP 网络捕获、页面正文存档、API 请求/响应正文、SSE/WebSocket 负载记录、诊断会话目录或诊断 ZIP 导出。
- 不提交 cookies、浏览器个人资料、Token、密码、本地 `settings.json`、`node_modules/`、`dist/` 或含提示词/回复正文的日志。

## 版本与提交约束

- 每次正式应用行为变更都要同步更新 `package.json`、`VERSION`、`src/index.html` 的版本显示、`CHANGELOG.md` 和 `docs/DEVELOPMENT-LOG.md`。0.1.16 之后的常规修复版本通常应为 `0.1.17`。
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

v0.1.15 已正式发布，下载入口见 README。下一步是用户 Windows 设备实际安装/启动，并在真实 ChatGPT 登录态中验证 `本轮` 标记从新版 app-shell 节点发现、命中、停止生成、正文稳定复核到新建下一轮的完整流程。若仍不触发，保留并提供 `结束回显扫描`、`结束回显节点发现` 或 `结束回显节点诊断` 日志（这些仅含 DOM 结构计数，不含回复正文）。不要把 CI 单元测试或 NSIS 构建成功误认为已完成人工端到端验证。

每次接手后先简洁汇报实际确认的分支/提交、版本、测试状态、打包状态和下一项具体工作，然后继续推进，不要重复询问文档中已有答案。

## Windows Actions 环境补充

- 第一轮 Actions `42388131374` 在 SemVer 正则校验失败，原因是 workflow 正则反斜杠转义过多；尚未进入依赖安装。
- 第二轮 Actions `42388205169` 通过版本校验，但在 `.gitignore` 的 SHA-256 检查发现 Windows checkout 将 LF 转为 CRLF，尚未进入依赖安装。
- 已添加 `.gitattributes`：`* text=auto eol=lf`，并把该文件纳入根目录相对源码清单。工作流现按 SHA 清单字段定长解析；新的第三轮运行将再次验证完整链路。
- 不要把前两次工作流失败认作应用单元测试失败；两次均在安装依赖和运行测试之前终止。


## Actions 自动发布与 electron-builder 修正

第三轮 Actions `42388312746` 已通过版本校验、18 项清单、npm install、32 项测试和 11 项语法检查，并实际生成了 `GPT Session Rotator-0.1.12-Setup.exe` 与 `.blockmap`。随后 electron-builder 因检测到 CI 而隐式尝试发布，因未设置 `GH_TOKEN` 退出；这是构建脚本问题，不是 NSIS 编译失败。现将 `package.json` 的 `dist:win` 改为显式 `--publish never`，由独立 Release job 负责上传和发布，避免在仓库保存个人 PAT。


## 已发布 Release：v0.1.12（2026-11-07）

- 最终 GitHub Actions run：`42388533990`，结论 `success`。Windows Test/Build 与 Publish Release 两个 job 均成功。
- 正式 Release：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.12 。标签指向提交 `a7c9e020840cf6e47e0e75177fe30f4f1df1539b`。
- Windows x64 NSIS：`GPT.Session.Rotator-0.1.12-Setup.exe`，102,026,111 bytes；SHA-256 `2be1d305aa44f9de4447aa2699ce4af57ff66ae631efb99526d6c015a3e67a69`。同页另有 `.blockmap` 附件。
- 32 项测试、11 个 JavaScript/CJS 语法检查、18 项源码 SHA-256 清单、Windows 安装包构建和 Release 上传均由最终成功的 Actions run 验证。
- 构建未配置代码签名证书，安装包为未签名版本；实际安装启动、SmartScreen 提示和登录态 ChatGPT 端到端行为仍需在用户 Windows 机器人工验证。
- `dist:win` 已使用 `--publish never`，由独立 Release job 使用 `GITHUB_TOKEN` 创建 Release，不需要个人 PAT。


## v0.1.13 本次修复重点

- 用户将助手结束回显设置为 `本轮完成` 后，助手回复中出现该文本却没有提前轮换。
- 原因：完成标记分析器只检查本轮新增助手节点中最后一个 DOM 节点；若 ChatGPT 在命中标记的回复后追加空节点/辅助节点，就会漏掉之前的标记回复。
- 修复：从本轮新增助手节点中由新到旧搜索含标记的节点，仍严格排除提交前基线中的旧消息。
- 新增运行日志：标记已识别但仍生成时提示等待；生成停止后提示稳定性复核；只有后续确认通过才触发下一轮。不会保存或输出助手回复正文。
- 回归测试覆盖自定义标记 `本轮完成`、命中后跟随空助手节点，以及旧回复不得误触发。


## v0.1.13 已正式发布

- Release：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.13
- Actions run `42392748703`：两个 Job 均 `success`。
- 自动测试：34 passed / 0 failed；JS/CJS 语法检查：11 个文件全部通过；源码清单：18 项全部通过。
- EXE：`GPT.Session.Rotator-0.1.13-Setup.exe`，102,026,276 bytes；SHA-256 `3cd3ad715a0f5fd6a11f71bd024f2de13baf3b46a3a710ae50ec8ed78af36587`。
- blockmap：106,082 bytes；SHA-256 `4eade552c8b22325a7b8f444cb52beab300641ae29e0c643fb2615c07253cefe`。
- 此版本修复自定义标记位于新增助手消息中、但后续空节点导致漏检的问题。保留提交前历史消息隔离，并增加识别/等待/确认日志。
- 安装包仍未配置代码签名；真实 Windows 安装启动及真实 ChatGPT 登录态页面行为仍需人工验证。


## v0.1.14 修复说明（2026-11-08）

- 根因路径：ChatGPT 可能在提交前创建空助手节点，提交后直接复用该节点写入当前回答。旧逻辑按消息 ID 排除所有提交前节点，因此即使该空节点后来含有“本轮”标记也不会匹配。
- 修复：提交基线额外记录空节点 ID；后续可匹配这些空节点被填充的内容，但仍排除提交前已有正文的历史助手消息。
- 日志新增“结束回显扫描”，只记录扫描成功与助手节点数量；回复文本只在内存内匹配，不落日志、不持久化。
- 两项回归测试分别验证空节点复用可触发和有正文历史消息继续排除。
- 真实 ChatGPT 登录态页面端到端验证仍须在用户设备完成；查看当前 Actions / Release 实际状态，不得凭版本号推断安装包已发布。


## v0.1.14 Actions 与 Release 最终结果

- Actions run：`42397308234`，最终 Release 已创建，两个 Job 均成功。
- `npm test`：36 passed / 0 failed；11 个 JS/CJS 文件 `node --check` 通过；18 项源码 SHA-256 清单全部通过。
- Windows x64 NSIS：`GPT.Session.Rotator-0.1.14-Setup.exe`，102,026,649 bytes；SHA-256 `430eecd0f9c13be8fb15bad27652eaf96fea4135c34d8363a2221f7a6751e8f6`。
- blockmap：106,083 bytes；SHA-256 `67481615298a55b13413813d7c6c7929dd0e0e63d7945b122300e6786a697ca8`。
- Release：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.14
- 安装包未配置 Authenticode 签名；真实 Windows 安装启动和 ChatGPT 登录态实机验证仍待用户设备完成。
