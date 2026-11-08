# 当前会话交接状态

更新日期：2026-11-08

> **实时状态：** 当前开发版本为 0.2.0；本轮功能为可选 GitHub Token 认证和仅对已认证请求开放的 30 秒轮询。正式发布状态必须以最新 Actions run 和 Release API 实际结果为准。
>
> **安全边界：** Token 只在主进程内存中用于请求；本机持久化仅保存 Electron safeStorage 密文。Windows 使用 DPAPI。renderer 只获得“已配置/认证失败”状态，不读取 Token。不得把真实 Token 放进测试、仓库、日志或开发对话。
>
> **速率与轮询：** 已认证个人账号 REST API 主限额为 5,000 次/小时；30 秒一次约 120 次/小时。额度与该 GitHub 账号其他应用请求共享。无 Token 或 Token 遭 HTTP 401 拒绝时，30 秒选项关闭并回退到 90 秒。
>
> **保留行为：** main SHA 启动基线、GitHub Date 时间计算、提交静默阈值、人工等待兜底、助手结束回显和对话长度检测保持不变。请求错误不能触发提前轮换。

## 本次 0.2.0 变更

- 主界面新增可选 GitHub Token 保存/清除控件；Token 不回显、不写日志、不进入源码。
- Token 采用 Electron safeStorage 加密接口；在 Windows 使用 DPAPI。加密不可用时拒绝保存，不以明文降级。
- Fine-grained PAT 建议只选择 `xiaobei206/padavan-4.4-2`，授予 `Contents: Read`。
- 已配置且未被 HTTP 401 拒绝的 Token 可使用 30/90/120/150/180 秒；未认证仅使用 90/120/150/180 秒。
- Token 收到 HTTP 401 后保留密文供用户更正，但停止发送该 Token、将间隔改为 90 秒并关闭 30 秒选项；重新保存正确 Token 可恢复。
- 删除 Token 时清除加密字段，并把 30 秒间隔自动调整为 90 秒。

## 当前验证边界

- 最近一次 Actions run `42478156331` 已通过版本校验及 18 项 SHA-256 manifest，但 Electron 安装脚本下载运行时收到 HTTP 504，npm install 失败，故单元测试、`node --check` 和 NSIS 均未执行。Windows workflow 已增加最多 4 次、10/20/40 秒退避的依赖安装重试；必须检查下一轮完整结果。
- 未在用户 Windows 设备安装并配置用户 PAT，不得宣称 DPAPI 存储及真实 API 认证已完成人工端到端测试。
- 不要求用户在聊天中粘贴 Token；用户只需在桌面应用的密码框内本地粘贴。

--- 历史交接记录（仅作背景；以上状态优先）

# 当前会话交接状态

更新日期：2026-11-08

> **当前权威状态说明（2026-11-08）：** 交接时必须重新读取远程 `main`、最新 Actions 和 Releases。本文件及开发日志中较早的 0.1.12–0.1.14 说明属于历史背景，不能覆盖后文 v0.1.15 的最终验证结果，也不能替代真实 ChatGPT 登录态的端到端测试。

> **当前开发项：** 0.1.16 的 Actions run #17（42475629231）已成功：38/38 测试、11 个 JS/CJS 语法检查、18 项 SHA-256 清单、Windows x64 NSIS 构建与工件上传全部通过。当前正式 Release 仍为 v0.1.15；单独的 `[release]` 提交将重新验证并触发 v0.1.16 正式发布。
>
> **保留待办：** 真实 Windows + ChatGPT 登录态的助手结束回显端到端验证尚未完成。
>
> **保留待办：** v0.1.15 助手结束回显链路尚未在真实 Windows + ChatGPT 登录态中完成人工端到端验证。

## 已确认

- 最新正式安装包仍为 `0.1.15`；本次源码版本改为 `0.1.16`，`VERSION`、`package.json`、界面显示和启动日志已同步。
- v0.1.15 app-shell 兼容修复提交：`37c4d728f335a194162f341c56a82ab95e110cc4`；清单修正提交 `5628c96932cb063fe83a078ce7caf5d4aac320c9`；测试断言修正提交 `dc7184d204ef4233e904fcbfb960cba657788a63`。
- Actions run `42400753265` 最终成功：38/38 测试通过、11 个 JS/CJS 文件语法检查通过、18 项源码 SHA-256 清单通过、Windows x64 NSIS 构建、工件上传和 Release job 全部成功。
- 正式 Release `v0.1.15`：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.15。
- 安装包 `GPT.Session.Rotator-0.1.15-Setup.exe`：102,028,250 bytes；SHA-256 `b5e8ba76ae6a2e68399be50a784a3cac69dad9b06a9e061f5777120677be28d4`。Blockmap：106,067 bytes；SHA-256 `4554b5936156b959a84088dc6d2161878f30677ed910714682da228bd876ae9f`。
- 用户已在 Windows 本地完成源码导入并成功推送。终端确认源码导入提交为 `fc22749d8f35f2ff9464605cbbb73df1098a64a3`，推送目标为 `origin/main`。
- 远程文件树中存在 `src/`、`tests/`、`package.json`、`VERSION`、`CHANGELOG.md`、`.gitignore` 和 `SOURCE-MANIFEST.sha256`。
- 源码包预期 SHA-256：`c6596bebd32ad13124f2dddd8374929bc4c555d248836f2b6d37ac553aab92df`。
- 当前源码没有 `package-lock.json`。没有锁文件前，不要使用 `npm ci`，也不要凭空生成或伪造锁文件。

## 验证状态：不要虚报

- 当前远程源码已通过本地复核：与导入提交逐文件核对 17/17 匹配；Node.js v22.16.0 的 `npm test` 为 32 passed / 0 failed；`node --check` 为 11 个文件全部通过。
- 先前导入脚本留下了 `$ExpectedHash` 字面量和 `total/pass/fail=未解析` 等占位内容。旧记录中的这些字段不是可核验的测试统计，不能作为当前远程源码已通过测试的证据。
- 本轮测试针对与 GitHub 导入提交逐文件核对一致的 0.1.12 源码目录重新执行，32 项全部通过。
- Windows NSIS 安装包尚未在本次导入流程中确认构建成功。
- 真实登录状态下的 ChatGPT 页面端到端行为仍待人工验证。

## 0.1.12 需要保持的功能

- GitHub 目标为 `xiaobei206/padavan-4.4-2` 的 `main`，轮询间隔可选 90/120/150/180 秒（默认 90 秒，运行中修改即时调整后续轮询）；默认静默阈值 15 分钟，阈值设置范围 1–180 分钟；启动时 SHA 仅作基线，GitHub 时间使用响应 `Date` 头。探测失败不应触发轮换或暂停手动等待。
- 助手完成标记默认为 `结束任务简报`。检查提交后新增的助手回复；提交前为空、提交后被填充的助手占位节点也可参与匹配；提交前已有正文的旧助手消息仍排除。生成结束后还需通过下一次稳定性复核才触发下一轮；空标记禁用此触发。
- 对话长度提示只检查 ChatGPT 主对话区，支持中/繁/英文和红字、红框或红背景证据，持续 5 秒确认；不应被滚动位置排除。
- 手动等待始终是兜底最大等待；预设有 40 分钟、没有 60 分钟。
- 不存储助手完整回复，不恢复网络正文捕获或诊断 ZIP 功能。

## 下一步

1. 用户在 Windows 上安装 v0.1.15，使用当前结束标记（如 `本轮`）实际跑一轮，确认新回复节点能被识别，回复生成结束且签名稳定后触发下一轮。关注 `结束回显扫描` 的 selector hit 计数、`结束回显节点发现` 和 `任务结束回显`。如果 60 秒仍无助手节点，查看 `结束回显节点诊断` 的 root/selector/visibility 计数；无需提供或保存回复正文。
2. 后续 GPT 接手时再从当前远程 `main` 拉取源码并复核测试和状态，不要依赖这里的旧 SHA。
3. 人工检查新旧回复隔离、回复继续增长时不提前触发、屏幕外长度警告、警告消失后的计时重置、GitHub API 失败时的手动计时兜底。
4. 本次 0.1.16 的 Actions 完成后，记录真实测试与 Windows 构建结果；只有 CI 成功后才推进正式 Release。HTTP 502 仍是单次检测失败，不应触发轮换或暂停人工计时。
5. 如再改源码，按版本规约同步修改版本文件、变更日志、测试和开发日志；文档单独变更可保持应用版本不变。

后续 GPT 必须先检查最新远程状态，不要假设本文提到的源码导入提交仍是最新 HEAD。

## 本轮验证与 Actions 发布流程 — 2026-11-07

- 本地验证环境：Node.js v22.16.0、npm 10.9.2。
- 自动测试：`npm test`，32 项通过、0 失败。
- 语法检查：`node --check` 覆盖 11 个 `.js` / `.cjs` 文件，全部通过。
- 源码一致性：17 个应用源文件/元数据的 Git blob 与导入源包逐文件核对一致。
- 源码清单：修正为仓库根目录相对路径，17 项 SHA-256 全部通过。清单涵盖 `.gitignore`、`CHANGELOG.md`、`VERSION`、`package.json`、`src/` 和 `tests/`；仓库合并导航后的 `README.md` 不纳入应用源文件清单。
- 新增 `.github/workflows/windows-release.yml`：Windows Runner 自动核验版本与清单、安装依赖、运行测试与语法检查、构建 NSIS，并上传 EXE 构建产物。仅在提交信息包含 `[release]` 时自动发布正式 GitHub Release；也可通过 `workflow_dispatch` 手动运行，默认只验证不发布。
- 当前没有已发布 Release 或 Git Tag；本次发布流程使用 `v0.1.12`。是否成功必须以 Actions run 和 Release 页面实际结果为准。
- Windows 安装包和 ChatGPT 实机验证：尚未确认成功。


## Actions 首次运行失败与修正

首次运行 `42388131374` 已确认在版本校验步骤失败，原因是 workflow 中 PowerShell 正则被多转义一层；失败发生在 npm install 之前，因此该 run 没有验证测试或安装包。`windows-release.yml` 已修正 SemVer 与 SHA-256 清单解析方式，并由新的 main 提交重新触发。请只根据新 run 的 job 步骤和结论确认 Windows 安装包是否成功生成；首次失败 run 不代表应用代码测试失败。


## Windows Actions 环境问题及修正

- Run `42388131374`：因 SemVer 正则转义过度在版本元数据检查失败，未运行 npm install/tests/build。
- Run `42388205169`：版本检查成功；因 Windows checkout 的 CRLF 转换导致 `.gitignore` 哈希不匹配，在清单步骤失败，未运行 npm install/tests/build。
- 已加入 `.gitattributes`：`* text=auto eol=lf`，让 Windows 工作区保留清单计算所需的 LF；`SOURCE-MANIFEST.sha256` 已新增 `.gitattributes` 项，共 18 个文件。第三次 Actions 将验证修复后的完整 Windows 链路。
- 前两次失败属于工作流校验实现问题，并非应用测试结果。


## NSIS 构建完成但 electron-builder 自动发布失败

第三轮 Actions `42388312746` 已成功安装依赖、跑完 32 项测试、通过 11 项语法检查、完成 Electron app packaging 和 NSIS installer 构建；输出中确认生成 `GPT Session Rotator-0.1.12-Setup.exe` 和 blockmap。构建命令随后因 electron-builder 在 CI 环境自动启用隐式发布、缺少 `GH_TOKEN` 而返回失败，Artifact 上传和 Release job 因此跳过。已将 `package.json` 的 `dist:win` 显式设为 `--publish never`，由 `softprops/action-gh-release` job 唯一负责创建 tag/Release。第四轮 Actions 将验证这一修复。


## 最终发布结果 — 2026-11-07

- GitHub Actions run `42388533990`：**success**。
- `Test and build Windows installer`：成功。版本检查通过；18 项源码清单通过；`npm install` 成功；`npm test` 32 passed / 0 failed；11 个 JS/CJS 文件 `node --check` 通过；`npm run dist:win` 成功；工件上传成功。
- `Publish GitHub Release`：成功。Release `v0.1.12` 已创建为正式版（非 Draft、非 Pre-release），地址：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.12 。标签指向 `a7c9e020840cf6e47e0e75177fe30f4f1df1539b`。
- 安装包：`GPT.Session.Rotator-0.1.12-Setup.exe`，大小 102,026,111 bytes，SHA-256 `2be1d305aa44f9de4447aa2699ce4af57ff66ae631efb99526d6c015a3e67a69`；另有 `GPT.Session.Rotator-0.1.12-Setup.exe.blockmap`（106,117 bytes）。
- 安装包未配置 Authenticode 代码签名；构建日志提示使用 Electron 默认图标。需要在实际 Windows PC 安装并启动确认；真实 ChatGPT 登录态 UI、代理、新旧回复隔离和滚动区警告仍需要人工端到端测试。
- 0.1.12 应用行为版本未改变。本轮修改仅包括源码清单/换行、Windows 构建命令和 Actions 发布链路。


## v0.1.13 — 修复助手自定义结束标记漏检

用户报告将标记设为 `本轮完成` 后，助手回复出现标记却不触发轮换。根因是 `analyzeAssistantCompletionSnapshot` 只检查本轮新增助手 DOM 节点中的最后一条；ChatGPT 若在带标记的回复后插入空白/辅助助手节点，之前的标记就被忽略。

修复后会从新消息列表末尾向前查找命中标记的助手回复，仍按提交前 baseline 排除旧消息；命中时若仍在生成，日志明确提示正在等待；生成停止后提示稳定性复核。新增回归测试包括精确的 `本轮完成` 场景及旧消息隔离。版本升至 0.1.13。已由 GitHub Actions run `42392748703` 验证 34/34 测试、11/11 语法检查、18 项 SHA-256 清单、Windows x64 NSIS 构建与正式 Release 全部成功。


## v0.1.13 Release 最终结果

- Release：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.13
- Actions run `42392748703`：`Test and build Windows installer` 与 `Publish GitHub Release` 两个 Job 均成功。
- `npm test`：34 passed / 0 failed；11 个 JS/CJS 文件 `node --check` 通过；18 项源码 SHA-256 清单通过。
- Windows NSIS：`GPT.Session.Rotator-0.1.13-Setup.exe`，102,026,276 bytes，SHA-256 `3cd3ad715a0f5fd6a11f71bd024f2de13baf3b46a3a710ae50ec8ed78af36587`；blockmap 106,082 bytes，SHA-256 `4eade552c8b22325a7b8f444cb52beab300641ae29e0c643fb2615c07253cefe`。
- 未配置 Authenticode 签名，使用 Electron 默认图标；需要用户在实际 Windows PC 安装和启动。真实 ChatGPT UI 的完整验证仍需人工确认。


## v0.1.14 本轮修复与验证状态 — 2026-11-08

- **代码提交：** `fa449d80b13af4b6c32435b6d3a78a15a5ca2b2c`，已推送至 `main`。
- **漏检路径：** ChatGPT 提交前预先创建空助手 DOM 节点，提交后在同一节点填入本轮回答；仅按基线 ID 排除节点会误把当前回答当作旧消息。
- **修复：** 基线新增 `emptyIds`，仅允许提交前为空的节点在提交后填充时参与标记匹配。提交前已有正文的历史节点仍排除；只保留 ID，不保存历史回复正文。
- **可观测性：** 新增“结束回显扫描”事件，报告助手节点数；原有“结束回显已识别”（仍生成）/“结束回显待确认”（生成结束待稳定轮询）/“任务结束回显”（已触发）用于区分状态。
- **回归测试：** 新增空占位节点复用成功用例，以及已有正文历史节点仍排除用例。
- **CI：** Actions run `42397308234` 已通过版本元数据、18 项源码 SHA-256、npm install、单元测试和 11 个 JS/CJS 语法检查；NSIS 构建正在执行（以实时 Actions 最终结论为准）。
- **人工验证：** 尚未在用户 Windows 设备及真实 ChatGPT 登录态中端到端验证。若安装后仍未轮换，需查看“回显监测基线”“结束回显扫描”“结束回显已识别/待确认”这几类日志确定具体阶段。


## v0.1.14 正式发布结果 — 2026-11-08

- Release：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.14
- Actions run：`42397308234`，Build 和 Publish 两个 Job 均成功。
- 自动测试：36 passed / 0 failed；JS/CJS 语法检查：11 个文件通过；源码清单：18 项全部通过。
- EXE：`GPT.Session.Rotator-0.1.14-Setup.exe`，102,026,649 bytes；SHA-256 `430eecd0f9c13be8fb15bad27652eaf96fea4135c34d8363a2221f7a6751e8f6`。
- blockmap：106,083 bytes；SHA-256 `67481615298a55b13413813d7c6c7929dd0e0e63d7945b122300e6786a697ca8`。
- 安装包未配置 Authenticode 签名；需用户 Windows 机器完成实际安装启动和 ChatGPT 登录态端到端验证。
