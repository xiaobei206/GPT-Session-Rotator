# Engineering Development Log

This is the chronological, engineering-facing record. Keep old entries intact. Every code/workflow-changing commit must append a dated entry in the same commit.

## 2026-11-07 — docs-only repository bootstrap

- **App version:** baseline remains 0.1.12; no application files changed in this bootstrap commit.
- **Intent:** establish an append-only engineering ledger as the first file in the previously empty Git repository, so even the bootstrap itself has an auditable log.
- **Root cause / context:** the target repository had no commits or branches; the application existed as a verified local 0.1.12 source archive.
- **Files:** `docs/DEVELOPMENT-LOG.md`.
- **Tests:** not run for this docs-only bootstrap commit.
- **Windows package:** not run.
- **Limitations / next action:** next commit imports the verified 0.1.12 app source and the full handoff/documentation system. Do not treat this bootstrap commit alone as a usable application checkout.

## 2026-11-07 — add mandatory GPT handoff and development process

- **App version:** docs-only; application remains at baseline version 0.1.12 and is not included in this commit.
- **Intent:** add the root-level `START-HERE-NEXT-GPT.rd` prompt, architecture, development/commit rules, current handoff state, test/release checklist, contribution guide, and pull-request template.
- **Files:** `START-HERE-NEXT-GPT.rd`, `CONTRIBUTING.md`, `docs/*.md`, `.github/pull_request_template.md`.
- **Tests:** no app tests run for this docs-only commit because the remote checkout does not yet contain app source. The extracted local 0.1.12 source baseline independently passed 32 tests before repository import.
- **Windows package:** not run.
- **Limitations / next action:** this commit alone is a handoff/doc scaffold, not a usable application checkout. The following commit imports the source, release metadata, file manifest, issue template, and CI workflow, then records the actual source-import test results.


## 2026-11-07 — source import status verified

- **App version:** documentation-only; application baseline remains 0.1.12.
- **Intent/effect:** make the Git handoff explicitly honest about the remaining source-import blocker, so a future GPT does not start development against an empty application tree or assume the docs-only commits contain the app.
- **Root cause:** the target repository was initially empty. The handoff scaffold was committed, but the verified 0.1.12 source archive has not yet been safely materialized as files on `main`. Attempts to stage raw archive chunks were not completed into a verified repository tree.
- **Files:** prepend the current-status blocker to `START-HERE-NEXT-GPT.rd` and `docs/SESSION-HANDOFF.md`; add root `README.md` and `docs/SOURCE-IMPORT-STATUS.md`; append this ledger entry.
- **Tests:** no application tests were run against the Git checkout because application source files are not yet present. Earlier authoring-environment evidence for the local archive: 32 unit tests passed and JavaScript syntax checks passed. Treat this as historical evidence, not remote-checkout verification.
- **Windows package:** not built or verified.
- **Limitations/next action:** upload/import the exact source archive or the extracted source tree, verify archive SHA-256 `c6596bebd32ad13124f2dddd8374929bc4c555d248836f2b6d37ac553aab92df`, then run `node --check` on all source files and `npm test`; build `npm run dist:win` only on a suitable Windows environment. Never mark this project source-complete before that happens.

## 2026-11-07 — import verified 0.1.12 application source

- **App version:** 0.1.12; source import only, no application behavior change.
- **Source integrity:** ZIP SHA-256 verified as $ExpectedHash.
- **Files:** imported src/, 	ests/, package.json, VERSION, .gitignore, and CHANGELOG.md; merged app README with repository navigation; regenerated root-relative source manifest.
- **Syntax checks:** 11 JavaScript/CJS files passed using 
ode --check.
- **Automated tests:** 
pm.cmd test exited 0; total=未解析, pass=未解析, fail=未解析.
- **Windows package:** not built in this operation.
- **Manual verification:** live ChatGPT UI not verified; completion-marker and red length-warning behavior still require manual validation.
- **Next action:** inspect CI results, build 
pm.cmd run dist:win on Windows, and manually test the documented triggers.

## 2026-11-07 — 修正源码导入后的交接记录

- **应用版本：** 文档维护，不改变 0.1.12 应用代码。
- **背景：** 用户已在 Windows 本地成功提交并推送源码导入提交 `fc22749d8f35f2ff9464605cbbb73df1098a64a3` 至 `origin/main`。远程文件树已包含 `src/` 和 `tests/`。
- **本次修正：** 更新 `START-HERE-NEXT-GPT.rd`、`docs/SESSION-HANDOFF.md` 和 `docs/SOURCE-IMPORT-STATUS.md`，明确源码已导入，并区分“文件已推送”和“测试/打包已验证”。
- **更正旧记录：** 先前导入脚本写入的字面量 `$ExpectedHash` 和 `total/pass/fail=未解析` 是占位或无法解析的字段，不得当作测试结果。历史源包测试记录不能替代当前远程检出的实测结果。
- **测试：** 本次仅更新文档，没有重新运行 `npm test`、`node --check` 或任何应用运行测试。当前远程检出版本的测试数值仍待实际执行。
- **Windows 安装包：** 本次未构建或验证。
- **下一步：** 用户准备进行验证后，从当前远程 `main` 运行测试与语法检查，再按需构建 Windows 安装包和进行 ChatGPT 实机验证。


## 2026-11-07 — 验证 0.1.12 并接入 Windows Actions Release

- **应用版本：** 0.1.12；本次未修改应用运行时代码。
- **验证对象：** 已由用户推送的源码导入提交。17 个应用源文件/元数据的 Git blob 与本地归档逐项一致。
- **测试：** Node.js v22.16.0 / npm 10.9.2；`npm test`：32 passed、0 failed；`node --check`：11 个 JS/CJS 文件全部通过。
- **修复：** 将 `SOURCE-MANIFEST.sha256` 的归档目录前缀改为仓库根目录相对路径；对 17 项重新计算 SHA-256 并全部验证通过。
- **Actions：** 新增 `.github/workflows/windows-release.yml`，在 Windows Runner 验证版本与源码清单、安装 npm 依赖、运行测试与语法检查、构建 x64 NSIS，并上传安装程序工件。带 `[release]` 的 main 提交在构建成功后发布 `v0.1.12` Release；手动工作流默认不发布。
- **Windows 构建：** 本地环境未执行 Windows NSIS 构建；等待本次 Actions 实际结果，不能预先标记通过。
- **实机验证：** ChatGPT 页面选择器、结束标记、滚动区长度警告及代理行为仍须人工验证。
- **下一步：** 查看由本提交触发的 Actions run；若失败，按日志修复并重新触发。仅在 Release 页面确实出现且附件存在后确认发布完成。


## 2026-11-07 — 修正首次 Actions 工作流校验脚本

- **背景：** 首次自动运行 `42388131374` 在 `Validate version metadata` 步骤失败，原因是工作流 YAML 内 PowerShell 正则反斜杠多转义，导致合法版本 `0.1.12` 未匹配。尚未运行 npm 安装、测试或打包步骤，也未创建 Release。
- **修复：** 改为无转义歧义的 SemVer 字符类表达式，并按 SHA-256 清单固定字段位置解析，避免 PowerShell/YAML 字符串转义再次影响清单校验。
- **下一步：** 本次修正提交再次触发 Windows Actions；只有版本/清单、依赖安装、32 项测试、11 项语法检查、NSIS 构建和上传均通过后，Release job 才会创建 `v0.1.12`。
- **本次本地应用测试：** 0.1.12 应用代码未改动；32/32 测试、11/11 语法检查及 17/17 源文件 SHA-256 已在上条记录中确认。Windows 打包仍以重跑 Actions 结果为准。


## 2026-11-07 — 固定 Windows checkout 换行并修正源码清单校验

- **根因：** 第二次 Actions `42388205169` 已通过 SemVer 检查，但 Windows runner 的 Git checkout 将仓库 LF 文本工作副本转换为 CRLF，工作区 SHA-256 与以 LF 计算的源码清单不一致。
- **修复：** 新增 `.gitattributes`（`* text=auto eol=lf`），强制文本工作区使用 LF；将 `.gitattributes` 纳入 `SOURCE-MANIFEST.sha256`，更新为 18 个根目录相对路径项。工作流此前的 SemVer 正则也已在上个提交修正。
- **测试：** 本地 0.1.12 应用测试仍为 32/32，11 个 JS/CJS 文件语法检查通过；18 项源码清单在 LF 工作区 `sha256sum -c` 全部通过。GitHub Windows Runner 尚待第三次执行验证。
- **Actions 失败记录：** `42388131374` 失败于版本正则；`42388205169` 失败于 Windows CRLF 哈希差异。两次都在 npm install 前停止，未执行应用测试或安装包构建。
- **应用版本：** 不变，仍为 0.1.12；未修改运行时代码。
- **下一步：** 观察本次 `[release]` 提交触发的第三次 Actions，成功后确认 `v0.1.12` Release 和 EXE 附件；失败则依据真实日志继续修复。


## 2026-11-07 — 禁止 electron-builder 在 CI 中隐式发布

- **根因：** 第三轮 Actions `42388312746` 已完成 NSIS 生成并输出 `GPT Session Rotator-0.1.12-Setup.exe` 与 blockmap，但 electron-builder 侦测到 CI 环境后隐式启动发布，因未提供个人 `GH_TOKEN` 而令构建 step 以 exit code 1 结束；正式发布本应由工作流后续 Release job 完成。
- **修复：** 将 `package.json` 的 `dist:win` 脚本改为 `electron-builder --win nsis --x64 --publish never`，明确构建阶段只打包、不自行上传。`softprops/action-gh-release` job 仍负责创建 `v0.1.12` Release 并附带 EXE/blockmap，使用 Action 的 `GITHUB_TOKEN` 写权限，不要求用户配置 PAT。
- **测试：** `npm test` 重新运行仍为 32 passed / 0 failed；18 项 root-relative manifest 在 LF 工作区全部通过；工作流在新一次 Windows Runner 上验证实际构建与 Release。
- **应用版本：** 仍为 0.1.12。本次仅修订 build 命令，不改运行时代码。
- **下一步：** 等待第四轮 Actions 确认 EXE 工件上传和 Release 页面创建成功；不得以第三轮输出的打包日志代替完整成功退出和工件可下载证据。


## 2026-11-07 — GitHub Actions 正式发布 GPT Session Rotator v0.1.12

- **结果：** GitHub Actions run `42388533990` 最终 `success`；Windows 构建 Job 和 GitHub Release Job 均成功。
- **验证：** 版本元数据匹配；18 项 root-relative SHA-256 清单通过；Windows runner `npm install` 成功；`npm test` 32 passed / 0 failed；11 个 JS/CJS 文件 `node --check` 通过。
- **构建：** `npm run dist:win` 成功生成 x64 NSIS：`GPT.Session.Rotator-0.1.12-Setup.exe`，102,026,111 bytes；SHA-256 `2be1d305aa44f9de4447aa2699ce4af57ff66ae631efb99526d6c015a3e67a69`。blockmap 106,117 bytes。
- **发布：** Release `v0.1.12` 已创建，非草稿、非预发布，且 EXE 与 blockmap 均已上传：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.12 。标签指向发布提交 `a7c9e020840cf6e47e0e75177fe30f4f1df1539b`。
- **修复链路：** 修正 SemVer 正则转义；使用 `.gitattributes` 固定 Windows 工作区 LF；`dist:win` 显式 `--publish never` 避免 electron-builder 误尝试上传，交由独立 Release job 发布。
- **限制：** 构建未配置 Authenticode 签名，使用 Electron 默认图标；未实际在用户电脑安装启动，未做真实 ChatGPT 登录态端到端验证。构建成功不能替代这些人工检查。
- **应用版本：** 0.1.12，运行时代码未更改。


## 2026-11-07 — 完善 README 正式版入口与用户说明

- **内容：** 在 README 顶部加入 v0.1.12 正式版下载链接、Release 页面、未签名提示和接手文档入口，并恢复完整应用用户说明，涵盖轮换逻辑、隐私、自动化流程、运行/构建和 0.1.12 新增功能。
- **应用代码/版本：** 不变，仍为 0.1.12。
- **验证：** 复用成功的 Actions run `42388533990`：32 项测试、11 项语法检查、18 项源码清单、Windows x64 NSIS 构建和 Release 上传均通过。此提交仅改变 README，不改变已发布安装包内容。


## 2026-11-08 — 修复自定义助手结束标记漏检（v0.1.13）

- **用户反馈：** 自定义助手结束回显标记设置为 `本轮完成`，助手回复已经出现四个字，但没有触发下一轮。
- **根因：** 分析器只读取本轮新增助手 DOM 节点列表的最后一项。如果 ChatGPT 在含标记的回复之后插入空白/辅助助手节点，最后一项没有标记，导致漏检。
- **修复：** 从最新到最旧遍历本轮新增助手节点，找到最新一条包含配置标记的回复；提交前 baseline 中的历史助手消息仍全部排除。增加阶段日志，区分标记已出现但仍生成、生成停止待稳定复核和最终触发；不记录回复正文。
- **回归测试：** 新增 `本轮完成` + 后续空助手节点测试，以及旧回复标记不得误触发测试。实际 Actions 结果待运行后回填。
- **版本：** `package.json`、`VERSION`、HTML 标题/界面版本、主进程版本及启动日志升至 0.1.13。
- **构建：** 本次提交触发 Windows Actions；只在 run 成功和 Release 附件上传后确认正式发布完成。


## 2026-11-08 — 补齐 v0.1.13 的 CHANGELOG SHA-256

- **Actions run：** `42392659844` 在源码清单步骤停止，原因是新增 `CHANGELOG.md` 版本说明后未同步替换清单哈希；应用安装、单元测试和 Windows 打包均未运行。
- **修复：** 重新计算 `CHANGELOG.md` 的 SHA-256 并更新 `SOURCE-MANIFEST.sha256`，其余 17 个清单条目保持本轮代码批次的正确哈希。
- **下一步：** 由本提交重新触发 Windows Actions，完成测试、语法检查、NSIS 构建和 v0.1.13 Release。


## 2026-11-08 — Actions 验证并正式发布 v0.1.13

- **Actions run：** `42392748703` 最终 `success`，Windows 构建和 GitHub Release 两个 Job 均成功。
- **测试：** `npm test`：34 passed / 0 failed；11 个 JS/CJS 文件 `node --check` 通过；18 项根目录相对 SHA-256 清单全部通过。
- **构建：** `npm run dist:win` 成功，Windows x64 NSIS 输出 `GPT.Session.Rotator-0.1.13-Setup.exe`（102,026,276 bytes），SHA-256 `3cd3ad715a0f5fd6a11f71bd024f2de13baf3b46a3a710ae50ec8ed78af36587`；blockmap（106,082 bytes），SHA-256 `4eade552c8b22325a7b8f444cb52beab300641ae29e0c643fb2615c07253cefe`。
- **Release：** `v0.1.13` 已正式发布，EXE 与 blockmap 均已上传：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.13 。Release tag 指向源码修复提交 `3dc2806e66118ba14d74d8dde49db544500785ca`。
- **功能修复：** 新增测试确认 `本轮完成` 在新助手消息里，即使随后有空助手节点也能识别；历史消息仍不得触发。运行日志显示“已识别但仍生成”及“生成结束待稳定复核”阶段，不记录回复正文。
- **限制：** 未配置 Authenticode 代码签名；实际设备安装启动与 ChatGPT 登录态端到端行为尚待用户机器人工验证。


## 2026-11-08 — 修复预创建空助手节点导致结束回显漏检（v0.1.14）

- **用户反馈：** 助手回复已经出现用户设置的“本轮”标记，但软件没有开始下一轮。
- **根因：** v0.1.13 只允许提交后新建的助手 DOM 节点；如果 ChatGPT 在提交前已经创建空助手占位节点，随后将本轮回复填入同一个节点，因其 ID 存在于提交前基线而被永久排除。此前测试只覆盖标记后新增空节点，没有覆盖空节点被复用。
- **修复：** 提交前基线现在记录消息 ID 和空节点 ID。新建消息仍可匹配；提交前为空的既有节点在提交后被填充时也可匹配；提交前已有正文的旧消息仍排除。只记录空节点 ID，不复制保存历史回复正文。
- **可观测性：** 新增“结束回显扫描”事件，报告扫描器是否成功读取页面以及助手节点数量，不记录回复正文。
- **文件：** `src/assistant-completion.cjs`、`src/main.cjs`、`tests/assistant-completion.test.cjs`、版本元数据、CHANGELOG 和源码清单。
- **测试：** 新增两项回归测试；当前执行环境不能解析 github.com，未能克隆仓库执行完整本地 `npm test`。本提交触发的 Windows Actions 将验证完整测试、语法检查与安装包构建；结果确认后补记准确数字。
- **打包：** 未在本地执行 Windows NSIS；以本次 Actions 实际结果为准。
- **实机限制：** 尚未接入用户运行中的 Electron/ChatGPT 页面，仍需真实登录态验证。助手回复正文没有记录到日志或持久化。


## 2026-11-08 — 更新 v0.1.14 交接和测试说明（docs-only）

- **原因：** v0.1.14 助手结束回显修复已进入 main，需要区分源码版本、已发布安装包版本和 Actions 当前验证阶段，避免后续接手误读。
- **更新：** 同步 `START-HERE-NEXT-GPT.rd`、`docs/SESSION-HANDOFF.md`、`docs/PROJECT-ARCHITECTURE.md`、`docs/TESTING-AND-RELEASE.md` 和下一版本规约。
- **测试：** 仅编辑文档，未重新运行应用测试；v0.1.14 应用测试与构建状态以对应 Actions run `42397308234` 的最终结论为准。
- **构建：** 本提交不改变应用源码或安装包内容；本次未在本地执行 Windows 打包。
- **待办：** 更新实际 NSIS/Release 结论，并在真实 ChatGPT 登录态页面验证结束标记的完整轮换链路。


## 2026-11-08 — Actions 验证并正式发布 v0.1.14

- **Actions run：** `42397308234` 最终成功；Windows Test/Build 与 Publish GitHub Release 两个 Job 均成功。
- **测试：** `npm test`：36 passed / 0 failed；11 个 JS/CJS 文件 `node --check` 通过；18 项根目录相对 SHA-256 清单全部通过。
- **构建：** Windows x64 NSIS 成功，`GPT.Session.Rotator-0.1.14-Setup.exe`（102,026,649 bytes），SHA-256 `430eecd0f9c13be8fb15bad27652eaf96fea4135c34d8363a2221f7a6751e8f6`；blockmap（106,083 bytes），SHA-256 `67481615298a55b13413813d7c6c7929dd0e0e63d7945b122300e6786a697ca8`。
- **发布：** `v0.1.14` 已正式发布：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.14。Release tag 指向应用修复提交 `fa449d80b13af4b6c32435b6d3a78a15a5ca2b2c`。
- **限制：** 安装包未配置 Authenticode 签名；没有在用户真实 Windows/ChatGPT 登录态中执行端到端验证。


## 2026-11-08 — 兼容新版 ChatGPT app-shell 助手消息 DOM（v0.1.15）

- **用户反馈：** v0.1.14 运行时，助手回复中已出现结束标记但没有提前开启下一轮。用户日志只显示提交后立即进行的首次扫描读到 0 条助手节点；这不能证明后续扫描仍为 0。
- **分析：** v0.1.14 仅查询旧版 \`[data-message-author-role="assistant"]\` 并限定在首个 \`main\` 内。新版 ChatGPT app-shell 可能使用活动时间线/transcript 根节点及 \`data-markdown-text-style="assistant-message"\`、\`data-turn-key\`、content-search key 等新标记，旧 role 选择器可能返回 0。
- **修复：** 新扫描器优先定位 app timeline / transcript / conversation 根节点，兼容旧 role 选择器与新版 assistant markdown / content-search 节点；通过 turn key 获取稳定 ID。扫描日志附带各选择器命中数；60 秒仍无可见助手节点时输出不含正文的结构诊断。
- **稳定性：** 每条消息额外计算内存文本签名；标记出现后若回复继续增长，稳定性确认重新开始。正文仍只用于进程内匹配，不输出、不保存、不上传。
- **测试：** 新增 app-shell DOM 模拟扫描测试和标记出现后正文继续变化的复核测试。完整测试、语法检查及 Windows 安装包由本次 GitHub Actions 验证，运行结果待回填。
- **构建：** 尚未验证；以 Actions 完整结论和 Release 附件为准。
- **实机限制：** 本环境无法读取用户真实登录态页面。回归测试覆盖新版 app-shell 特征结构，但最终仍需在用户 Windows 安装后进行端到端确认。


## 2026-11-08 — 修正 v0.1.15 首轮 Windows 清单校验值（CI-only）

- **Actions run：** `42400547124`；版本元数据校验通过，但源码清单在 `src/main.cjs` 停止，Runner 计算值为 `091a2ddb474b74f8669f3b7b08aa0abdc15b4d0f74b020a0c7e9191760e066c0`，与初次生成值不同。
- **修复：** 将 `SOURCE-MANIFEST.sha256` 中 `src/main.cjs` 改为 Windows Runner 实际计算的 SHA-256。该 run 未进入依赖安装、自动测试、语法检查或打包。
- **下一步：** 由本提交重新运行完整清单、测试、语法检查及 Windows 构建；如再有哈希差异，以 Runner 原始输出逐项修正。


## 2026-11-08 — 更新 app-shell 扫描回归测试断言（CI-only）

- **Actions run：** `42400647281` 已通过版本检查、18 项源码清单和依赖安装；`npm test` 为 36 passed / 2 failed，未运行语法检查与 NSIS 构建。
- **失败原因：** 一项旧测试仍要求扫描器必须直接调用 `document.querySelector('main')` 且禁止 `document.body`，与新增的 app-shell root 优先级/最终 fallback 不符；新模拟 DOM 的文本断言则未反映 NFKC 将全角冒号归一为半角冒号的既有行为。
- **修复：** 更新两条断言以覆盖 app timeline root 与最终 body fallback，并将测试期望文本改为规范化后的半角冒号。应用运行时代码不变。
- **下一步：** 重新执行完整自动测试、语法检查、NSIS 构建和 Release；仅以新 run 的最终结论判断成功与否。
