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


## 2026-11-08 — v0.1.15 Actions 全通过并正式发布

- **最终 Actions run：** \`42400753265\`，workflow conclusion \`success\`；\`Test and build Windows installer\` 与 \`Publish GitHub Release\` 两个 Job 均成功。
- **版本/清单：** 版本元数据检查成功；18 项根目录相对 SHA-256 清单全部通过。
- **自动测试：** \`npm test\` 为 38 passed / 0 failed；11 个 JS/CJS 文件的 \`node --check\` 全部通过。
- **构建：** Windows x64 NSIS 安装包构建与工件上传成功。
- **发布：** GitHub Release \`v0.1.15\` 已作为正式版创建（非 Draft、非 Pre-release）：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.15。
- **安装包：** \`GPT.Session.Rotator-0.1.15-Setup.exe\`，102,028,250 bytes，SHA-256 \`b5e8ba76ae6a2e68399be50a784a3cac69dad9b06a9e061f5777120677be28d4\`；blockmap 106,067 bytes，SHA-256 \`4554b5936156b959a84088dc6d2161878f30677ed910714682da228bd876ae9f\`。
- **限制：** 安装包未配置 Authenticode 签名；没有在用户真实 Windows/ChatGPT 登录态中端到端测试。因此本次只能确认 CI 和安装包成功，不能宣称用户现场的提前轮换已实测成功。

## 2026-11-08 — 增加单一 AI 接手入口并澄清当前状态

- **原因：** 用户希望新对话只提供仓库链接与“请接手继续开发”即可快速恢复开发。原有详细交接充分，但分布于 README、根目录交接规程、交接状态和长篇历史日志，历史记录可能增加新对话识别当前状态的成本。
- **变更：** 新增根目录 `AI_BOOTSTRAP_PROMPT.md`，集中规定接手步骤、实时状态核验、隐私边界、当前 v0.1.15 基线与首要待办；README 将其设为第一入口；详细交接规程与当前交接状态标明权威阅读顺序和历史记录优先级。
- **验证：** 文档-only 更新；未改变应用代码与安装包，因此未重新运行应用测试或 Windows 构建。下一轮接手必须实时检查 `main`、Actions 和 Release。
- **限制：** v0.1.15 的 CI 与 NSIS 构建成功不等于用户真实 Windows/ChatGPT 登录态端到端行为已验证。


## 2026-11-08 — GitHub API 查询间隔可配置（0.1.16；当前提交 Actions 验证待完成）

- **用户可见效果：** 主面板新增 GitHub API 查询间隔下拉菜单：90、120、150、180 秒，每 30 秒一档；默认 90 秒。选项保存到用户设置，运行中变更会重排下一次轮询，不需重启。
- **背景：** 用户报告原 90 秒查询偶发 HTTP 502、随后再次查询又可成功，希望自行调整查询频率。本次只增加频率控制，不把偶发 502 误判为已根因修复；请求失败仍跳过本次静默判定，不触发轮换，也不暂停人工计时。
- **实现：** 添加允许值规范化、持久化读写、IPC 暴露、面板恢复/变更处理和活动等待周期的重排回调；保留启动 SHA 基线、GitHub Date 时间计算、静默阈值逻辑与现有错误处理。
- **文件：** `src/github-monitor.cjs`、`src/settings.cjs`、`src/main.cjs`、`src/preload.cjs`、`src/renderer.js`、`src/index.html`、`src/style.css`、`tests/github-monitor.test.cjs`、`tests/settings.test.cjs`、`VERSION`、`package.json`、`CHANGELOG.md`、`README.md`、接手/架构/测试文档和 `SOURCE-MANIFEST.sha256`。
- **本地测试限制：** 本环境尝试克隆远程仓库执行基线测试，但命令以 `fatal: unable to access 'https://github.com/xiaobei206/GPT-Session-Rotator.git/': Could not resolve host: github.com` 失败。因此本环境未运行修改前/修改后的 `npm test`、`node --check` 或 `git diff --check`，不得宣称这些本地检查通过。
- **修改前 CI 基线：** 已核实 Actions run `42474591382` 对修改前 `main` 的结论为 `success`；这是基线，不是当前 0.1.16 功能的验证。
- **Windows 包与实机：** 本环境未运行 Windows NSIS 安装包构建；当前 0.1.16 的构建结果须以本次提交触发的 Actions 实际输出为准。真实 Windows + ChatGPT 登录态端到端验证仍未完成。
- **发布边界：** 本次功能提交不主动申请正式 Release；仅在本次 Actions 测试、源码清单和 Windows 构建成功后再发布 0.1.16。
- **下一步：** 查看当前提交对应的 Actions jobs、测试统计、语法检查、18 项源码 SHA-256 清单和 NSIS 工件；如果失败，则按新版本规则修正并重新验证。


## 2026-11-08 — 0.1.16 Actions 验证成功，准备正式发布

- **验证提交：** `d4644457cf94b82e1022e47a0edb9be7483fa829`；Actions run #17：`42475629231`，最终 workflow conclusion 为 `success`，链接：https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42475629231。
- **自动测试：** `npm test` 输出为 38 tests、38 pass、0 fail。
- **语法检查：** `node --check` 对 11 个 JavaScript/CJS 文件通过。
- **源码清单：** Windows Runner 核实 `SOURCE-MANIFEST.sha256` 共 18 项，全部通过。
- **Windows 构建：** Windows x64 NSIS 构建成功；`windows-nsis-installer` 工件上传成功，artifact ID `13614619034`，Actions 工件压缩包大小 102,136,639 bytes。此数值是 Actions artifact ZIP，不是最终 Setup.exe 本体大小或 SHA-256。
- **发布状态：** 本次功能提交的 Release Job 因提交未带 `[release]` 而按预期跳过；截至本条记录更新时，正式 Release 仍是 v0.1.15。下面独立的 `[release]` 提交将再次运行验证与 Windows 构建，并在成功后创建 v0.1.16。
- **实机边界：** 自动测试、CI 和 Windows Runner 构建通过，不代表用户本地安装/升级或真实 ChatGPT 登录态已端到端验证。助手结束回显的人工实测仍待完成。


## 2026-11-08 — 可选 GitHub Token 认证与 30 秒轮询（0.2.0；CI 待验证）

- **用户可见效果：** 新增 GitHub Token 保存/清除控件。无 Token 时仍可选 90/120/150/180 秒；配置且未被 GitHub HTTP 401 拒绝的 Token 后，开放 30 秒选项。30 秒约为每小时 120 次 API 请求。
- **根因与目的：** GitHub REST API 对未认证请求按出口 IP 共享 60 次/小时限额；用户希望在可选认证后提升轮询频率。已认证个人账号主限额为 5,000 次/小时，但与同一账号其他应用请求共享，且仍受次级限流约束。
- **安全设计：** Token 仅从 renderer 通过窄 IPC 传入主进程；主进程用 Electron safeStorage 加密后写入本机设置。Windows 使用 DPAPI；加密不可用时拒绝保存，不以明文回退。明文仅留在主进程内存供请求使用；只有目标 commit endpoint 附加 Bearer header。UI 只接收 configured/rejected 状态；日志不输出 Token。
- **降级行为：** 清除 Token 会删除密文并将当前 30 秒间隔降至 90 秒；HTTP 401 会停止发送被拒绝的 Token、标记认证失败、自动降回 90 秒并关闭 30 秒选项。重新保存正确 Token 可以恢复。
- **实现文件：** `src/github-monitor.cjs`、`src/settings.cjs`、`src/main.cjs`、`src/preload.cjs`、`src/renderer.js`、`src/index.html`、`src/style.css`、`tests/github-monitor.test.cjs`、`tests/settings.test.cjs`、版本元数据、README、CHANGELOG、架构/测试/接手文档及源码 SHA-256 清单。
- **测试：** 新增 Bearer header、30 秒认证门控、safeStorage 密文读写、明文不落盘和安全存储不可用时 fail-closed 测试。当前工具执行环境未提供本地工作区，未声称本地 `npm test` / `node --check` / `git diff --check` 已通过；须以随后真实 Actions run 为验证依据。
- **Windows / 实机：** Windows NSIS 构建待 Actions 验证；用户本地 DPAPI 解密、Token 权限与 HTTP 401/恢复流程仍待 Windows 实机验证。
- **发布边界：** 功能提交不带 `[release]`；只有测试、源码清单、语法检查和 Windows 安装包构建成功后，再用独立记录提交触发正式 Release。


## 2026-11-08 — v0.2.0 首轮 Windows CI 测试回归与修正

- **Actions run：** `42478042621`（https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42478042621），测试步骤失败，41 项中 39 项通过、2 项失败；版本校验和 18 项源码 manifest 校验均成功。语法检查与 NSIS 构建因测试失败而跳过。
- **失败原因一：** 重写 `src/settings.cjs` 时遗漏了既有公开导出 `DEFAULT_ASSISTANT_COMPLETION_MARKER`；缺省助手结束标记测试因此得到 `undefined`。
- **失败原因二：** 静默阈值校验错误文本从 `1 to 180` 改为 `1 through 180`，破坏了原有测试契约。
- **修正：** 恢复导出 `DEFAULT_ASSISTANT_COMPLETION_MARKER`，并恢复原有 `1 to 180` 错误文本。Token 加密/解密与明文不落盘两项新测试均已在首轮 CI 通过。
- **后续：** 重新运行完整测试、语法检查、manifest 校验及 Windows NSIS 构建；当前没有发布 Release。


## 2026-11-08 — Windows CI transient Electron download timeout and bounded retry

- **Actions run:** `42478156331` (https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42478156331). Version metadata and all 18 source-manifest hashes passed. The dependency-install step failed before unit tests or packaging.
- **Observed failure:** npm ran `node_modules/electron/install.js`, which attempted to download the Electron runtime and received HTTP 504 (Gateway Timeout). npm subsequently printed Windows EPERM cleanup warnings for partially installed directories. No application test, syntax-check, or NSIS result was produced by this run.
- **CI-only correction:** replace the single dependency-install attempt with up to four full `npm install --no-audit --no-fund` attempts, with 10/20/40-second backoff. This is bounded retry for transient package/runtime download failures; it does not suppress the final error or make a failed install appear successful.
- **Application source/version:** unchanged at 0.2.0. No source-manifest entries change because this commit updates only workflow and documentation files.
- **Next verification:** require one complete subsequent Windows run to pass dependency installation, unit tests, JavaScript syntax checks, x64 NSIS build, and artifact upload before the separate `[release]` commit.


## 2026-11-08 — 修正 Electron 39 safeStorage API 兼容性

- **发现方式：** 发布前对照 Electron 官方版本文档核对运行时依赖，发现项目固定依赖 Electron `^39.0.0`，而 `isAsyncEncryptionAvailable/encryptStringAsync/decryptStringAsync` 不属于 Electron 39 的 safeStorage API。上一轮 CI 使用模拟的 async safeStorage 对象，不能证明应用在当前 Electron 39 运行时能保存 Token。
- **影响范围：** Windows Token 保存与读取会因 API 不存在而失败；普通运行、无 Token 轮询和其它功能不受影响。此前 v0.2.0 仍未发布，未让用户拿到存在此问题的安装包。
- **修正：** safeStorage 适配器优先使用可用的异步 API；在当前 Electron 39 上回退到现有同步 `isEncryptionAvailable/encryptString/decryptString` API。Windows 两条路径均使用 DPAPI；仍然只持久化密文，禁止明文降级。
- **测试：** 保留 async API 模拟测试，并新增 Electron 39 同步 API 合约测试，覆盖保存、密文不含明文、读取及清除。
- **发布前验证：** 完整重跑 Windows Actions；只有当前 Electron 39 兼容路径测试、现有测试、manifest、语法检查和 NSIS 构建全部成功后，才创建正式 Release。


## 2026-11-08 — v0.2.0 完整 Electron 39 Windows CI 验证通过，准备正式发布

- **Actions run：** `42478877203`（https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42478877203），head `ae5c0c20c666580d2e19e30bd61aeada095ba2dc`，build job completed/success。
- **依赖安装：** retry-enabled `npm install --no-audit --no-fund` 成功。
- **单元测试：** 42 tests、42 pass、0 fail。包括 async safeStorage 模拟测试及 Electron 39 同步 DPAPI safeStorage 兼容测试。
- **语法：** 11 个 JS/CJS 文件的 `node --check` 全部通过。
- **源码完整性：** 18 项 `SOURCE-MANIFEST.sha256` 全部通过。
- **Windows 构建：** 成功生成 x64 NSIS `GPT Session Rotator-0.2.0-Setup.exe` 和对应 `.blockmap`；无 Authenticode 签名证书，按既有工作流跳过代码签名。
- **Actions 工件：** `windows-nsis-installer.zip`，102,138,524 bytes，SHA-256 `a7278dd94f259d853d916d6ee65f68604f199fb51eee512f42f23b8c68f10596`，artifact ID `13616747321`。
- **Release 状态：** 此验证提交没有 `[release]`，故 Publish GitHub Release job 按设计 skipped；正式发布需要下一条单独 docs-only `[release]` 提交。
- **实机边界：** CI 证实 Electron 39 API 兼容代码的合约测试通过；未实际在用户电脑配置 PAT、验证本机 DPAPI 密文或进行真实 API 认证端到端测试。


## 2026-11-08 — v0.2.0 正式 Release 发布成功

- **正式版本：** `v0.2.0`，Release ID `438225755`，2026-11-08 12:17:48 UTC 发布；`draft=false`、`prerelease=false`。
- **Release 页面：** https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.2.0
- **最终 Actions：** run `42479071427`，整体 completed/success；`Test and build Windows installer` 与 `Publish GitHub Release` 两个 job 均 completed/success。
- **自动验证：** 42/42 tests pass、0 fail；11 个 JS/CJS 文件 `node --check` 全部通过；18 项 `SOURCE-MANIFEST.sha256` 全部通过；Windows x64 NSIS 构建与附件上传成功。
- **安装包：** `GPT.Session.Rotator-0.2.0-Setup.exe`，102,030,846 bytes；GitHub Release API digest SHA-256：`a03ee6c24164c5d6bbc3b359982f7a07681141ee6327e4d346980cc3721f87f5`。
- **blockmap：** `GPT.Session.Rotator-0.2.0-Setup.exe.blockmap`，106,041 bytes；GitHub Release API digest SHA-256：`3ac8cdc747bf6d14360f95e7aafc1ea240bb5c0d75709835d501f6dfa71e1bea`。
- **未完成的实机验证：** 未在用户 Windows PC 完成安装、真实 DPAPI 密文重启解密、PAT 认证和 30 秒轮询端到端验证；这些步骤须由用户安装后在本机完成，Token 不得通过聊天提供。


## 2026-11-08 — v0.2.1 左侧设置区滚动与固定操作栏

- **用户反馈：** 左上角设置区域内容被裁切，无法稳定输入固定提示词；窗口内容布局也可能把“开始”按钮推到难以点击的位置。
- **根因：** `src/style.css` 为整个 `.controls` 使用 `overflow:hidden`，但内部多个设置行、结束标记、提示词编辑框按静态布局叠加；面板高度固定 330px，提示词框只有 50px 高，因此超出部分直接被裁切，未提供内部滚动区域。
- **设计修正：** 把最长等待、自定义时间、开始/停止、刷新 GPT 和“提示词”快捷入口放入固定工具栏；所有其余设置包入 `.settings-scroll`，设定 `overflow-y:auto`、`min-height:0` 和可见滚动条。提示词框默认 140px 高、可竖向调整，添加“提示词”按钮滚动并聚焦编辑框。
- **回归测试：** 新增 `tests/ui-layout.test.cjs`，验证 Start/Stop 等操作位于滚动容器外，提示词及设置位于滚动容器内、CSS 提供纵向滚动、提示词框支持调整高度且快捷按钮连接正确。
- **版本 / 元数据：** 更新 `VERSION`、`package.json`、界面和启动日志版本为 0.2.1；更新 README、CHANGELOG、接手文档及源码 SHA-256 清单。
- **本地验证边界：** 当前 connector 会话未提供可运行的本地工作树，未宣称本地 `npm test`、`node --check` 或 `git diff --check` 已通过。此前 v0.2.0 Windows CI 通过 42/42 测试；本次新增 UI 回归测试和整个项目会由新的 Windows Actions run 验证。
- **Windows / Release：** 此提交先触发验证构建，不触发正式 Release。只有所有单元测试、11+ JS/CJS 语法检查、manifest、Windows x64 NSIS 构建和工件上传成功后，才创建独立 `[release]` 文档提交。


## 2026-11-08 — v0.2.1 设置滚动布局 Windows CI 验证通过，准备正式发布

- **验证提交：** `4c7ee71e9d05ece7da18ed0a328f7fb17fdac108`
- **Actions run：** `42483012468`（https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42483012468），整体 completed/success；`Test and build Windows installer` 成功，Release job 因为本提交不是 `[release]` 而按设计 skipped。
- **自动测试：** 44 tests、44 pass、0 fail；包含 2 项新建 UI 布局回归测试，验证主要操作按钮位于独立滚动区之外、提示词位于滚动区内，且样式支持滚动/调整高度。
- **语法检查：** 12 个 JS/CJS 文件全部 `node --check` 通过。
- **源码清单：** 19 项 `SOURCE-MANIFEST.sha256` 全部通过。
- **Windows 构建与上传：** 成功构建 x64 NSIS `GPT Session Rotator-0.2.1-Setup.exe` 及 blockmap，并上传 Actions artifact `windows-nsis-installer.zip`；102,138,790 bytes，ZIP SHA-256 `7f9e795480fd590f251c6bc9e866a607ea98a08c07628009e12667667cb3a96c`，artifact ID `13618491167`。
- **已知边界：** 本次自动化验证没有覆盖用户电脑上的人工窗口视觉验收；尚未发布 v0.2.1。接下来单独 `[release]` docs-only 提交将触发正式发布流程，发布完成后再核对 EXE 与 blockmap 的实际 Release 资产。


## 2026-11-08 — v0.2.1 正式 Release 发布成功

- **正式 Release：** `v0.2.1`，Release ID `438253372`，2026-11-08 13:07:37 UTC 发布；`draft=false`、`prerelease=false`。
- **Release 页面：** https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.2.1
- **最终 Actions：** run `42483241721`，completed/success；`Test and build Windows installer` 与 `Publish GitHub Release` 两个 job 均成功。
- **自动验证：** 44/44 tests pass、0 fail；12 个 JS/CJS 文件 `node --check` 通过；19 项 `SOURCE-MANIFEST.sha256` 通过；Windows x64 NSIS 构建与上传成功。
- **安装包：** `GPT.Session.Rotator-0.2.1-Setup.exe`，102,031,179 bytes；GitHub Release digest SHA-256：`ac63d87b015d90407ba2de0d9c59756dab24cfa73d49503e791f19ba32457010`。
- **blockmap：** `GPT.Session.Rotator-0.2.1-Setup.exe.blockmap`，106,074 bytes；GitHub Release digest SHA-256：`2d445dc490210a5203db0c4ee9a44b8ddb303ca95b71a0ac1751224b5df9700f`。
- **视觉验收边界：** UI 结构回归测试与 Windows 构建通过；尚未在用户桌面分辨率/显示缩放下人工运行并验收窗口视觉布局。用户安装后仍需确认滚动区、提示词聚焦与按钮可点击体验。


## 2026-11-08 — v0.2.2 修复 GitHub Token 状态同步与轮询可观测性

- **用户现场反馈：** 日志显示 Token 已保存，但 30 秒选项仍灰色、清除 Token 按钮仍禁用、状态仍显示“未设置”；等待日志中长期没有 COMMIT 检查记录。
- **根因一：** 主进程 Token 保存/清除 IPC 返回 `configured` / `rejected`，渲染层却只读取 `githubTokenConfigured` / `githubTokenRejected`，造成真实配置状态未同步到控件。
- **修复一：** 保存/清除 IPC 改为与 `browser:status` 相同的状态字段，携带当前轮询间隔；渲染层额外兼容旧的短字段名。保存后 30 秒轮询选项按有效认证状态开放，清除后按钮和状态标签及时更新，轮询恢复到至少 90 秒。
- **根因二：** 成功查询到相同 SHA 的正常轮询不写日志；代码虽有定时请求，但使用者无法通过运行日志判断轮询是否持续发生。
- **修复二：** 对每次成功的 unchanged SHA 查询增加“GitHub轮询检查”状态日志，包含 main 短 SHA、GitHub Date 计算的提交年龄、启动基线/候选状态、是否使用 Token 认证以及静默阈值。发现新提交仍用专门的事件日志；不记录 Token、commit message 或正文。
- **回归测试：** 新增 `tests/github-token-ui.test.cjs`，检查保存/清除状态字段与渲染层契约，并防止成功的 unchanged 查询失去可见心跳或意外包含提交正文。
- **版本/清单：** 更新版本元数据、GitHub User-Agent、`CHANGELOG.md`、README、测试/发布说明、交接文档和 `SOURCE-MANIFEST.sha256`。
- **本地验证：** 当前 connector 会话未提供可执行本地工作树；未声称本地 `npm test`、`node --check` 或 `git diff --check` 已运行。Windows Actions 必须验证测试、语法、manifest 和 NSIS 构建。
- **发布状态：** 此条为应用源码版本 0.2.2 的验证提交，不含 `[release]`；正式发布必须等验证构建成功后另发独立 `[release]` 文档提交，再确认实际 Release 资产。


## 2026-11-08 — v0.2.2 Windows CI 验证通过，触发正式 Release

- **验证提交：** `24206277861c1dd725e31592c7de9f8a7d782b3a`。
- **Actions run：** `42487032072`（https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42487032072），整体 completed/success；Test/build job 成功，Publish job 因验证提交不含 `[release]` 而按设计 skipped。
- **自动测试：** 46 tests、46 pass、0 fail；包含 Token 保存/清除状态契约、未变化 SHA 的安全轮询心跳，以及原有功能回归。
- **语法与清单：** 13 个 JS/CJS 文件 `node --check` 全部通过；20 项 `SOURCE-MANIFEST.sha256` 全部通过。
- **Windows 构建与上传：** x64 NSIS `GPT Session Rotator-0.2.2-Setup.exe` 和 blockmap 构建成功；Actions 工件 `windows-nsis-installer.zip`，102,139,073 bytes，SHA-256 `44682ffe944ab3f33a7b1fe036ea4e7b6b59b5f2ae7edd21cae03e00653589e6`，artifact ID `13619494585`。
- **签名状态：** 当前没有配置 Authenticode 代码签名证书；安装包按既有 CI 流程跳过代码签名。
- **发布动作：** 本提交标题包含 `[release]`，让 Release job 在重新跑过版本、manifest、测试、语法和 Windows 安装包构建后创建正式 Release；只有该 run 成功并能读到正式资产后，才更新最终下载链接和安装包摘要。
- **实机边界：** CI 不会验证用户电脑上的 DPAPI 解密、真实 PAT 权限或 ChatGPT 登录态下发现新提交后提前轮换；这些仍需要本机实测。


## 2026-11-08 — v0.2.2 正式 Release 发布成功

- **正式 Release：** `v0.2.2`，Release ID `438281311`，2026-11-08 13:57:12 UTC 发布；`draft=false`、`prerelease=false`。
- **Release 页面：** https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.2.2
- **最终 Actions：** run `42487228051`，completed/success；`Test and build Windows installer` 与 `Publish GitHub Release` 两个 job 均成功。
- **自动验证：** 46/46 tests pass、0 fail；13 个 JS/CJS 文件 `node --check` 通过；20 项 `SOURCE-MANIFEST.sha256` 通过；Windows x64 NSIS 构建、工件上传、正式 Release 发布均成功。
- **安装包：** `GPT.Session.Rotator-0.2.2-Setup.exe`，102,031,538 bytes；GitHub Release digest SHA-256：`4ac5d9887fef82db8fefc70dfdc33b8864d97a4154f799da72ea4ee74881a4c1`。
- **blockmap：** `GPT.Session.Rotator-0.2.2-Setup.exe.blockmap`，106,062 bytes；GitHub Release digest SHA-256：`8d579a55d4ab17261a8fec412616cac5543fda88b5d23d7990a231c3d6965b32`。
- **构建与签名：** Release run 的 NSIS 构建和上传全部成功；未配置 Authenticode 代码签名证书，按 CI 设置跳过签名。
- **实机边界：** 尚未在用户 Windows PC 上验证 Token 的 DPAPI 保存/重启读取、真实 GitHub Token 权限或 ChatGPT 登录态中发现新提交并触发下一轮。用户安装后应验证保存状态、30 秒档、清除状态和按所选间隔出现的“GitHub轮询检查”日志。


## 2026-11-08 — v0.2.3 新增 GitHub Actions 启动前门禁（CI 待验证）

- **用户需求：** 每次手动启动自动轮换时，先检查目标仓库 main 分支是否有旧任务的 GitHub Actions 正在排队或运行，避免手动停止应用后立刻启动并与仍未完成的构建/测试冲突。
- **设计：** 查询 `xiaobei206/padavan-4.4-2` 的 Actions runs，过滤 main 分支的 `queued`、`in_progress`、`waiting`、`pending`、`requested` 状态；每 60 秒重查。无活动工作流则立刻放行。
- **超时/取消：** 等待上限为点击“开始”时选定的最长等待时长；Actions API 单次请求最多 15 秒。Stop 可以取消门禁，取消后的旧检查不会启动任何 ChatGPT 轮次。超时或持续无法查询时写入警告并按要求继续启动，绝不无限等待。
- **基线时序：** 只有门禁清除或超时后才记录 GitHub main commit baseline，避免门禁等待期间已存在的 commit 被误判成启动后的新提交。
- **权限兼容：** 可先用已保存 Token 查询 Actions；若 PAT 无 Actions 权限（401/403/404），对公开仓库退回匿名 API 请求，不把 Actions 端点权限不足误判为 Token 无效。
- **隐私：** 只记录工作流名、Run ID、状态和短 SHA；不记录 commit title/body、Token 或 API 正文。
- **回归测试：** 新增 `src/github-actions-gate.cjs` 与 `tests/github-actions-gate.test.cjs`，覆盖活动状态筛选、匿名回退、无活动立即放行、等待至完成、固定超时/API 失败超时和停止取消。
- **本地验证：** 此 connector 会话没有本地工作树，未声称运行 `npm test`、`node --check` 或 `git diff --check`。需要 Windows Actions 实际验证全套测试、清单和 NSIS。
- **发布状态：** 应用版本 0.2.3，尚未正式发布；仅在 CI 验证成功后另提交 `[release]` 发布记录并确认最终安装包资产。


## 2026-11-08 — v0.2.3 收紧 Actions 门禁的硬超时边界（发布前复核）

- **复核发现：** PAT 请求返回 401/403/404 后，原实现可能把匿名回退请求的 timeout 重新计一次；另外，如果 API 适配器返回迟到的空列表，门禁也需要在处理成功结果时再次核对绝对截止时间。
- **修正：** Token 与匿名回退请求共用同一个请求时间预算；等待器收到 API 结果后再次检查绝对 deadline，晚到的成功响应不能把已经超时的门禁改判为通过。超时仍记录警告并继续启动，不会死等。
- **新增测试：** 新增两项边界回归：Token 权限不足且共享请求预算耗尽时不启动第二次匿名请求；API 返回空列表但已超过门禁截止时间时仍返回 timeout。
- **验证状态：** 修正前的 v0.2.3 源码在 Actions run `42488698932` 中 54/54 测试、15 项语法检查、22 项清单及 Windows NSIS 构建通过；这两项新测试和本次修改尚待 Actions 重新验证，旧 run 不能作为新 SHA 的最终证明。


## 2026-11-08 — v0.2.3 防止超时后出现误导性的“Actions检查通过”日志

- **复核发现：** 对一个超过门禁截止时间才返回的空列表，等待器虽会返回 `timeout` 并继续启动，但之前会先触发成功状态回调，造成“检查通过”与“等待超时”两条相互矛盾的日志。
- **修正：** 现在先检查绝对 deadline，确认尚未超时后才发送成功回调；迟到响应只走超时路径。
- **回归测试：** 扩展“迟到 API 结果不能放行门禁”的测试，额外断言超时结果不会发出成功回调。
- **验证状态：** 修正前同版本 SHA `30365163734d1395c97ab6f55971e2afaecb2f4b` 的 Actions run `42489179835` 已通过 56/56 测试、15 项语法检查、22 项 manifest 和 Windows x64 NSIS 构建；当前小修须由新的 Actions run 再验证，之后才可以发布。


## 2026-11-08 — v0.2.3 最终源代码验证通过，准备正式发布

- **最终源代码提交：** `b3ca80047059368ab6bc3b116a3bd2701c261a86`。
- **Actions run：** `42489476190`（https://github.com/xiaobei206/GPT-Session-Rotator/actions/runs/42489476190），completed/success；验证分支的 Publish GitHub Release job 按设计 skipped，因为该提交不带 `[release]`。
- **自动测试：** 56 tests、56 pass、0 fail；覆盖所有启动门禁路径，包括 Token 权限不足时的匿名回退共享预算、门禁 deadline 后迟到响应不得放行/不得发成功回调，以及停止取消。
- **语法与清单：** 15 个 JS/CJS 文件 `node --check` 全部通过；22 项 `SOURCE-MANIFEST.sha256` 全部通过。
- **Windows 构建与上传：** x64 NSIS `GPT Session Rotator-0.2.3-Setup.exe` 与 blockmap 构建成功；Actions 工件 `windows-nsis-installer.zip`，102,141,658 bytes，SHA-256 `90aa609c0b42dd8eaf1a1522f792991b91ccffc87eecd2032fd0b78d98b52ed3`，artifact ID `13620902700`。
- **签名状态：** 未配置 Authenticode 代码签名证书，构建按既有配置跳过签名。
- **发布状态：** 单独的 `[release]` 文档提交将触发正式 Windows 验证与发布流程；只有 Release tag/资产最终出现后才记录正式安装包 SHA-256 并更新下载链接。
- **实机边界：** 尚未在用户 Windows PC 验证真正的 GitHub Actions 等待过程、DPAPI/PAT 或 ChatGPT 登录态端到端。该流程的自动化回归测试通过不代表这些手工测试已完成。


## 2026-11-08 — v0.2.3 正式 Release 发布成功

- **正式 Release：** `v0.2.3`，Release ID `438298327`；`draft=false`、`prerelease=false`。
- **Release 页面：** https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.2.3
- **最终 Actions：** run `42489779743`，completed/success；`Test and build Windows installer` 与 `Publish GitHub Release` 两个 job 均成功。
- **自动验证：** 56/56 tests pass、0 fail；15 个 JS/CJS 文件 `node --check` 通过；22 项 `SOURCE-MANIFEST.sha256` 通过；Windows x64 NSIS 构建、工件上传和正式 Release 发布成功。
- **安装包：** `GPT.Session.Rotator-0.2.3-Setup.exe`，102,033,908 bytes；GitHub Release digest SHA-256：`c2222fe20e6b82267fd37843f002ad209fd67c5d64c25d891bbf79bc19741d24`。
- **blockmap：** `GPT.Session.Rotator-0.2.3-Setup.exe.blockmap`，106,096 bytes；GitHub Release digest SHA-256：`bd5721ef9993efef0130a361cc1deed475721093b42a4409c9119918bdc734e4`。
- **构建与签名：** Release run 的 NSIS 构建和上传均成功；未配置 Authenticode 代码签名证书，构建跳过签名。
- **实机边界：** 用户 Windows PC 上的真实 Actions 等待、DPAPI/PAT 和 ChatGPT 登录态端到端仍待人工验证；需确认 Stop 取消立即生效、活动 Actions 结束放行、最长等待时间到达后放行。
