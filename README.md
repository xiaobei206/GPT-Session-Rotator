# GPT Session Rotator

**最新正式版仍为 v0.1.15；main 源码已更新为 0.1.16，待 Actions 验证后发布新安装包。**

**Windows x64 安装包：** [下载 GPT Session Rotator 0.1.15](https://github.com/xiaobei206/GPT-Session-Rotator/releases/download/v0.1.15/GPT.Session.Rotator-0.1.15-Setup.exe)

**[GitHub Release 页面](https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.1.15)**

> 安装包由 GitHub Actions 在 Windows Runner 上构建并通过 Release 发布。当前 EXE 未配置 Authenticode 代码签名；请在 Windows 设备上完成安装和启动验证。

## 开发接手与项目文档

新对话接手开发时，先阅读根目录的 [AI_BOOTSTRAP_PROMPT.md](AI_BOOTSTRAP_PROMPT.md)，再按其中顺序阅读详细交接规程 [START-HERE-NEXT-GPT.rd](START-HERE-NEXT-GPT.rd)。

- [当前交接状态](docs/SESSION-HANDOFF.md)
- [开发规矩与 Git 工作流](docs/DEVELOPMENT-RULES.md)
- [项目架构](docs/PROJECT-ARCHITECTURE.md)
- [测试与发布清单](docs/TESTING-AND-RELEASE.md)
- [逐次开发日志](docs/DEVELOPMENT-LOG.md)
- [源码导入与验证状态](docs/SOURCE-IMPORT-STATUS.md)

---

# GPT Session Rotator 0.1.16 — User Guide

A lightweight Windows Electron utility that repeatedly opens a fresh ChatGPT conversation, optionally selects Think, pastes a fixed prompt, submits it, and starts the next cycle when the configured wait expires or an early-rotation condition is met.

## v0.1.16 GitHub API 查询间隔可配置

- 面板下拉菜单提供 90、120、150、180 秒四档，默认 90 秒，间隔为 30 秒一档。
- 修改后自动保存；运行过程中即时重排下一次轮询，不需要停止/重启。当前已经发出的请求不会被中断。
- 选 180 秒可把常规查询频率从约每小时 40 次降低到约 20 次。该设置只能降低请求频率，不能保证消除 GitHub 或代理偶发的 HTTP 502；失败的检查仍不会触发轮换，人工等待计时继续。

## v0.1.15 助手结束回显修复

- 兼容新版 ChatGPT app-shell：除了旧版助手 role 属性，也扫描活动时间线/transcript 中的 `data-markdown-text-style="assistant-message"` 节点，并通过 `data-turn-key` 等属性识别回合。
- 启动日志现在列出根节点和各选择器命中计数；运行满 60 秒仍未发现助手节点时输出结构诊断，便于区分选择器未命中与可见性过滤，不记录回复正文。
- 命中标记后比较内存文本签名；如果助手仍在继续补充文字，稳定确认会重新计时，等回复真正停稳后才提前轮换。

## Rotation rules

The manual wait remains the maximum wait. Use the dropdown (10, 15, 20, 25, 30, 35, 40, or 45 minutes) or enter a custom value from 1 to 1440 minutes. The 60-minute preset has been removed; 40 minutes has been added.

When automation starts, the app first reads the current `main` head of `xiaobei206/padavan-4.4-2` and records that SHA as the startup baseline. This pre-existing commit is never eligible for early rotation, regardless of its existing age; this prevents an immediate new conversation right after the first prompt is submitted. During wait windows, the app checks the branch at the selected 90, 120, 150, or 180 second interval (90 seconds by default). Only a SHA that appears after the startup baseline is eligible, and it triggers once its GitHub-server-calculated commit age reaches the configured quiet threshold (15 minutes by default). A newer SHA resets the candidate. If the startup baseline request fails, the first later successful poll only establishes the baseline and cannot trigger rotation.

Commit age uses the GitHub HTTP `Date` header and the commit's committer timestamp. VPS timezone and local clock settings therefore do not enter the quiet-time calculation. If GitHub cannot be reached, returns an error, or omits a valid `Date` header, GitHub early rotation is skipped for that check and the manual timer continues normally.

GitHub requests use the embedded browser's Electron session, including the proxy configured in the app. No GitHub token is required; the endpoint is public. The monitor does not download source files or inspect commit diffs.

The Chinese/English conversation-length warning detector checks red-text or red-framed length-limit messages anywhere in the rendered ChatGPT main content DOM, including content below the current scroll viewport. The same warning must be observed continuously for five seconds before early rotation; sidebars, navigation, generic alerts, and out-of-main portals do not qualify.

The app also watches the latest assistant reply added after the current cycle submits its prompt. By default, the reply must contain `结束任务简报`; the marker can be changed in the UI (up to 100 characters), persists in `settings.json`, and applies immediately during a run. ChatGPT may create an empty assistant placeholder before submission and fill that same node with the current reply; a node proven empty in the pre-submit baseline is allowed to match after it is populated, while nodes that already contained historical text remain excluded. The marker must be present, generation must stop, and a subsequent stable DOM poll must confirm it before the next cycle starts. Leave the field blank to disable this trigger. The reply text is inspected in memory only for marker matching and is not written to logs or files.

## Kept lightweight

0.1.14 retains the previous removal of always-on CDP diagnostics, network request/response body capture, diagnostics directories, and one-click diagnostics ZIP export. It does not record ChatGPT page bodies, API bodies, SSE content, WebSocket payloads, or DOM event timelines. The small on-screen run log remains and can still be exported manually as a TSV table. Assistant response text is never added to this log. Existing diagnostic folders from older versions are left untouched; 0.1.12 does not append to them.

## Automation sequence

1. Navigate to the ChatGPT new-chat entry and wait 30 seconds.
2. Verify that a fresh conversation and composer are available. If not, skip submission rather than risk using an old conversation.
3. Expand the sidebar if needed.
4. If enabled, attempt to set Think up to three times. The first failure refreshes the current empty conversation and waits 30 seconds; the second failure waits another 30 seconds; after the third failure the cycle continues.
5. Wait 20 seconds, paste the configured prompt, wait another 20 seconds, then submit.
6. During the wait window, monitor GitHub (90-second interval), the assistant completion marker, and conversation-length warnings (1.5-second DOM scan interval). A completed new assistant reply containing the configured marker starts the next cycle; a red-text or red-frame length warning must remain continuously detected for five seconds. Whichever early-rotation condition is first confirmed starts the next cycle; otherwise the manual timer remains in control.

## Run and build

Requires Node.js and npm. From the project directory:

```powershell
npm install
npm start
```

Build a Windows x64 installer:

```powershell
npm run dist:win
```

Run built-in tests:

```powershell
npm test
```

`dist:win` explicitly disables electron-builder's implicit CI publishing; GitHub Actions uploads the completed installer and creates the Release in a separate job.

## Notes

- The app's configured manual interval continues to run when GitHub is unreachable. A pre-existing repository head is only a baseline; if no new commit appears during this automation run, GitHub quiet-time monitoring will not shorten the current wait.
- The GitHub monitor watches only the `main` branch head and does not infer whether a coding task is complete.
- The GitHub API may be subject to transient upstream or proxy failures as well as unauthenticated rate limits. At 90 seconds the app issues about 40 polls per hour during a wait window; at 180 seconds it issues about 20. HTTP 502 is treated as a failed check and does not trigger rotation.
- Existing app data such as the lifetime cycle count and embedded-browser session are preserved.

## 0.1.14 修复

- 修复预先创建的空助手 DOM 节点后来被本轮回答复用时，标记因节点 ID 已存在于提交前基线而被误判为旧消息的漏检。
- 仅允许提交前确认为空的节点被填充后参与匹配；提交前已有正文的旧消息继续排除。
- 新增“结束回显扫描”状态日志和两项回归测试；36 项测试通过，回复正文仍只在内存中匹配，不写入日志。

## 0.1.13 修复记录与 0.1.12 新增行为

- GitHub main 分支查询间隔可在主界面选择 90、120、150 或 180 秒（每 30 秒一档，默认 90 秒），修改后运行中立即调整后续轮询；静默阈值默认 15 分钟，可设为 1–180 分钟。两项配置均保存在应用本地设置文件中。
- GitHub 仍只对本次自动轮换启动后出现的新 SHA 计时，启动前已有提交不触发轮换。
- 对话长度提示扫描 ChatGPT 主内容区域全部已渲染 DOM，不受当前滚动位置限制；中英文红字或红框均支持，同一提示连续确认 5 秒后直接开启新对话。
- 新增助手结束回显标记，默认“结束任务简报”；只检测本轮提交后新增的助手回复，不看用户提示词和旧回复。助手出现标记且生成结束后立即开启新对话。标记可在界面编辑、自动保存、运行中即时生效，留空可关闭。
- 人工最长等待时间仍保留为兜底；GitHub/页面检测异常不会自动暂停轮换。

The GitHub quiet-time setting is stored in the app user-data directory as `settings.json`; it survives app restarts and can be changed while automation is running. The available range is 1–180 whole minutes.
