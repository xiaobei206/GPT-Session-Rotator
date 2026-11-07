# 源码导入状态

更新日期：2026-11-07

## 导入结果

- 状态：**源码已导入并推送到 `main`**。
- 用户终端确认的源码导入提交：`fc22749d8f35f2ff9464605cbbb73df1098a64a3`。
- 应用版本：`0.1.12`。
- 源码包预期 SHA-256：`c6596bebd32ad13124f2dddd8374929bc4c555d248836f2b6d37ac553aab92df`。
- 已提交的应用文件包括 `src/` 下 8 个文件和 `tests/` 下 4 个测试文件，以及 `package.json`、`VERSION`、`CHANGELOG.md`、`.gitignore` 和 `SOURCE-MANIFEST.sha256`。
- `package-lock.json` 未包含在源码包中，当前没有人为伪造锁文件。

## 尚未在当前检出版本确认的事项

- [x] 当前远程源码对应的 0.1.12 源码目录运行 `npm test`：32 passed / 0 failed。
- [x] `node --check`：11 个 JavaScript/CJS 文件通过。
- [x] `SOURCE-MANIFEST.sha256` 改为仓库根目录相对路径，17 项 SHA-256 全部匹配。
- [ ] 在 Windows 环境运行 `npm install` 和 `npm run dist:win`，记录真实构建结果。
- [ ] 人工验证完成标记、红色长度警告、GitHub 静默阈值和手动等待兜底。

此前导入脚本产生的 `$ExpectedHash` 和 `total/pass/fail=未解析` 占位已由本次文档收尾明确更正；新的测试统计和 SHA-256 结果来自本轮实际执行。Windows 打包与 ChatGPT 实机验证仍未完成。

## GitHub Actions

工作流：`.github/workflows/windows-release.yml`。

- 推送到 `main`：在 `windows-latest` 上安装依赖、验证版本/清单、执行测试和语法检查、构建 x64 NSIS，并上传安装程序工件。
- 提交信息包含 `[release]` 且验证/构建 job 成功：自动创建版本标签并发布 GitHub Release，附带安装程序。
- 手动运行 `workflow_dispatch` 时，`publish_release` 默认 `false`；需要发布时显式选择 `true`。
- Release 的最终成功状态以 Actions 与 Releases 页面的实际记录为准。


## Actions 首次运行记录

- Run `42388131374`：失败于 `Validate version metadata`，原因是 workflow PowerShell 正则转义问题；npm 安装、自动测试、语法检查与 Windows 打包均因前置步骤失败而跳过。
- 已修正工作流，新的 main 提交将重新触发完整流程。只有新 run 成功并且 Release 资源实际存在后，才标记 Windows 构建/发布完成。


## Windows Actions 校验问题记录

- Run `42388131374`：SemVer 正则反斜杠多转义，版本校验失败。
- Run `42388205169`：版本校验通过，但 Windows checkout 的 CRLF 转换导致 `.gitignore` SHA-256 不匹配。
- 已修正 workflow 正则；添加 `.gitattributes` 固定 LF；更新清单为 18 个根目录相对文件。两次失败均发生在 npm install 前，未运行应用测试或 Windows 打包。
- 第三次 Actions 的最终状态决定 Windows 打包和 Release 是否可确认完成。


## 第三轮 Actions 结果与修正

- Run `42388312746`：版本一致、18 项 SHA-256 清单、npm install、32 项自动测试、11 项语法检查均通过。
- `npm run dist:win` 实际生成了 NSIS EXE 与 blockmap，但 electron-builder 因 CI 检测隐式启用上传，最后报错 `GitHub Personal Access Token is not set`。Workflow artifact 上传及 Release job 因构建 step 非零退出而跳过。
- 已把 `package.json` 的 `dist:win` 脚本改为 `electron-builder --win nsis --x64 --publish never`。正式 Release 由后续 Action job 使用 `GITHUB_TOKEN` 完成，不需要个人 PAT。
- 第四轮运行需确认 build step、installer artifact 与 GitHub Release 全部成功。


## 最终发布已完成

- 最终 Actions run `42388533990`：全部成功。
- 最终检查：版本元数据通过；18 项 SHA-256 清单通过；npm 安装成功；32/32 测试通过；11/11 语法检查通过；Windows x64 NSIS 构建与工件上传成功。
- Release `v0.1.12`：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.12
- EXE：`GPT.Session.Rotator-0.1.12-Setup.exe`，102,026,111 bytes，SHA-256 `2be1d305aa44f9de4447aa2699ce4af57ff66ae631efb99526d6c015a3e67a69`。
- `.blockmap`：`GPT.Session.Rotator-0.1.12-Setup.exe.blockmap`，106,117 bytes。
- 代码签名：未配置，EXE 未签名。真实设备安装启动与 ChatGPT UI 端到端验证仍待用户机器完成。


## v0.1.13 验证与发布

- 修复助手结束标记漏检：搜索本轮新增助手消息中所有候选，而非只看最后一个 DOM 节点。
- 新增日志显示标记匹配、仍在生成、稳定性复核阶段；不记录助手回复正文。
- 回归测试覆盖 `本轮完成`、标记后跟随空助手节点、旧回复隔离。
- 版本：0.1.13。等待 GitHub Actions Windows 测试/NSIS 构建和 Release `v0.1.13` 完成后补充实际结果。


## v0.1.13 发布完成

- Actions run `42392748703`：最终 `success`。
- Windows Test/Build job：成功；npm install 成功；34/34 测试通过；11/11 语法检查通过；18 项 SHA-256 清单通过；Windows x64 NSIS 构建与 artifact 上传成功。
- GitHub Release：`v0.1.13` 已正式发布：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.13
- EXE：102,026,276 bytes；SHA-256 `3cd3ad715a0f5fd6a11f71bd024f2de13baf3b46a3a710ae50ec8ed78af36587`。
- blockmap：106,082 bytes；SHA-256 `4eade552c8b22325a7b8f444cb52beab300641ae29e0c643fb2615c07253cefe`。
- EXE 未做 Authenticode 签名；实际设备安装/启动与 ChatGPT UI 端到端验证仍待人工完成。


## v0.1.14 验证与正式发布

- Actions run `42397308234`：最终成功。
- 36/36 单元测试通过；11 个 JS/CJS 语法检查通过；18 项 SHA-256 清单通过。
- Windows x64 NSIS 安装包：`GPT.Session.Rotator-0.1.14-Setup.exe`，102,026,649 bytes；SHA-256 `430eecd0f9c13be8fb15bad27652eaf96fea4135c34d8363a2221f7a6751e8f6`。
- blockmap：106,083 bytes；SHA-256 `67481615298a55b13413813d7c6c7929dd0e0e63d7945b122300e6786a697ca8`。
- 正式 Release：https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.14
- 安装包未签名；用户设备安装启动与真实 ChatGPT 登录态端到端行为仍待人工验证。
