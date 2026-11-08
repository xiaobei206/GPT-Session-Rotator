# GPT Session Rotator

**最新正式版仍为 v0.2.2。v0.2.3 启动前 GitHub Actions 门禁已通过 Windows CI（56/56 测试、15 项语法检查、22 项源码清单），正在进入正式发布验证。**

**最新正式安装包：** [下载 GPT Session Rotator 0.2.2](https://github.com/xiaobei206/GPT-Session-Rotator/releases/download/v0.2.2/GPT.Session.Rotator-0.2.2-Setup.exe)

**[最新正式 Release 页面](https://github.com/xiaobei206/GPT-Session-Rotator/releases/tag/v0.2.2)**

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

# GPT Session Rotator 0.2.3 — User Guide

A lightweight Windows Electron utility that repeatedly opens a fresh ChatGPT conversation, optionally selects Think, pastes a fixed prompt, submits it, and starts the next cycle when the configured wait expires or an early-rotation condition is met.

## v0.2.3 启动前等待 GitHub Actions

- 点击“开始”后，程序先查询 `xiaobei206/padavan-4.4-2` 的 `main` 分支工作流。发现排队、等待或运行中的 Actions 时，每 60 秒复查一次；只有确认没有活动工作流后才打开新 ChatGPT 对话。
- 门禁最长等待时间使用当前设置的最长等待分钟数。达到上限仍有工作流未结束，或一直无法查询状态时，会记录警告并继续启动；不会无限等待。点击“停止”可以立即取消门禁。
- 门禁只在每次点击“开始”时执行；正常轮换周期保持原样。Token 若无 Actions 读取权限，程序会对公开仓库的 Actions 接口退回匿名查询，不会因此判定 Token 无效。
- 启动前等待中的日志只显示工作流名、Run ID、状态和短 SHA，不显示提交标题、Token 或正文。

## v0.2.2 GitHub Token 状态同步与轮询日志

- 修复主进程 Token 保存/清除返回字段与界面读取字段不一致的问题；保存后会立即启用 30 秒轮询选项、启用“清除 Token”按钮并显示“已加密保存”，清除后显示“未设置”并回退至 90 秒。
- 成功查询到相同 main SHA 时新增“GitHub轮询检查”日志，显示短 SHA、提交年龄、基线/候选状态、Token/匿名认证方式和静默阈值。
- 日志不会记录 Token、commit message 或提交正文。

## v0.2.1 设置区布局优化

- 最长等待时间、开始/停止、刷新 GPT 和“提示词”快捷按钮固定在左侧卡片顶部，不随设置内容滚动。
- 代理、Think、GitHub 监控、结束标记和固定提示词置于独立纵向滚动区；滚动条常驻可见。
- 固定提示词编辑框默认更高，并可拖动调整高度；点击“提示词”可滚动到编辑框并聚焦。

## v0.2.0 GitHub Token 可选认证与 30 秒轮询

- 不配置 Token 时，保留 90、120、150、180 秒四档，默认 90 秒。
- 保存 Token 后，额外开放 30 秒档；每小时约 120 次请求，低于个人账号已认证 REST API 的 5,000 次/小时主要限额，但额度仍与该账号其他应用请求共享，并受次级限流约束。
- Token 只通过 Electron safeStorage 加密保存在本机；Windows 使用 DPAPI。界面不回显 Token，日志和仓库也不会记录 Token。
- 建议创建 Fine-grained personal access token，只选择监测仓库 `xiaobei206/padavan-4.4-2`，仅授予 `Contents: Read` 权限并设置合理到期时间。
- 如删除 Token，或 GitHub 返回 HTTP 401，程序会关闭 30 秒档并回退到 90 秒。其余 SHA 基线、静默判断及手动等待兜底保持不变。

## v0.1.15 助手结束回显修复

- 兼容新版 ChatGPT app-shell：除了旧版助手 role 属性，也扫描活动时间线/transcript 中的 `data-markdown-text-style="assistant-message"` 节点，并通过 `data-turn-key` 等属性识别回合。
- 启动日志现在列出根节点和各选择器命中计数；运行满 60 秒仍未发现助手节点时输出结构诊断，便于区分选择器未命中与可见性过滤，不记录回复正文。
- 命中标记后比较内存文本签名；如果助手仍在继续补充文字，稳定确认会重新计时，等回复真正停稳后才提前轮换。

## Rotation rules

The manual wait remains the maximum wait. Use the dropdown (10, 15, 20, 25, 30, 35, 40, or 45 minutes) or enter a custom value from 1 to 1440 minutes. The 60-minute preset has been removed; 40 minutes has been added.

When automation starts, the app first reads the current `main` head of `xiaobei206/padavan-4.4-2` and records that SHA as the startup baseline. This pre-existing commit is never eligible for early rotation, regardless of its existing age; this prevents an immediate new conversation right after the first prompt is submitted. During wait windows, the app checks the branch at the selected 90, 120, 150, or 180 second interval (90 seconds by default), or every 30 seconds when an optional GitHub Token is configured. Each successful poll that sees no SHA change now emits a status-only heartbeat log; errors and unchanged SHAs remain non-triggering. Only a SHA that appears after the startup baseline is eligible, and it triggers once its GitHub-server-calculated commit age reaches the configured quiet threshold (15 minutes by default). A newer SHA resets the candidate. If the startup baseline request fails, the first later successful poll only establishes the baseline and cannot trigger rotation.

Commit age uses the GitHub HTTP `Date` header and the commit's committer timestamp. VPS timezone and local clock settings therefore do not enter the quiet-time calculation. If GitHub cannot be reached, returns an error, or omits a valid `Date` header, GitHub early rotation is skipped for that check and the manual timer continues normally.

GitHub requests use the embedded browser's Electron session, including the proxy configured in the app. A Token is optional because the endpoint is public. When configured, it is sent only as a Bearer authorization header for the monitored commit request. The plaintext Token is encrypted by Electron safeStorage before local persistence; on Windows the platform encryption uses DPAPI. The Token is never exposed back to the renderer or written to run logs.

To create a least-privilege credential, use GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens. Select only `xiaobei206/padavan-4.4-2` and grant `Contents: Read`. Paste it into the GitHub Token field and save; the app never displays the stored value. If the saved Token receives HTTP 401, the app disables 30-second polling and returns to 90 seconds until a replacement is saved. The monitor does not download source files or inspect commit diffs.

The Chinese/English conversation-length warning detector checks red-text or red-framed length-limit messages anywhere in the rendered ChatGPT main content DOM, including content below the current scroll viewport. The same warning must be observed continuously for five seconds before early rotation; sidebars, navigation, generic alerts, and out-of-main portals do not qualify.

The app also watches the latest assistant reply added after the current cycle submits its prompt. By default, the reply must contain `结束任务简报`; the marker can be changed in the UI (up to 100 characters), persists in `settings.json`, and applies immediately during a run. ChatGPT may create an empty assistant placeholder before submission and fill that same node with the current reply; a node proven empty in the pre-submit baseline is allowed to match after it is populated, while nodes that already contained historical text remain excluded. The marker must be present, generation must stop, and a subsequent stable DOM poll must confirm it before the next cycle starts. Leave the field blank to disable this trigger. The reply text is inspected in memory only for marker matching and is not written to logs or files.

## Kept lightweight

0.1.14 retains the previous removal of always-on CDP diagnostics, network request/response body capture, diagnostics directories, and one-click diagnostics ZIP export. It does not record ChatGPT page bodies, API bodies, SSE content, WebSocket payloads, or DOM event timelines. The small on-screen run log remains and can still be exported manually as a TSV table. Assistant response text is never added to this log. Existing diagnostic folders from older versions are left untouched; 0.1.12 does not append to them.

## Automation sequence

1. When Start is pressed, query queued/active Actions runs for `xiaobei206/padavan-4.4-2` on `main`. If any exist, recheck every 60 seconds and do not open a new ChatGPT conversation until they finish. Stop cancels this startup gate.
2. The gate is bounded by the currently configured maximum-wait interval. If that deadline expires or the Actions status cannot be fetched, log a warning and proceed; the gate cannot wait forever.
3. After the gate clears or times out, record the GitHub main commit baseline, navigate to the ChatGPT new-chat entry, and wait 30 seconds.
4. Verify that a fresh conversation and composer are available. If not, skip submission rather than risk using an old conversation.
5. Expand the sidebar if needed.
6. If enabled, attempt to set Think up to three times. The first failure refreshes the current empty conversation and waits 30 seconds; the second failure waits another 30 seconds; after the third failure the cycle continues.
7. Wait 20 seconds, paste the configured prompt, wait another 20 seconds, then submit.
8. During the wait window, monitor GitHub (90-second interval), the assistant completion marker, and conversation-length warnings (1.5-second DOM scan interval). A completed new assistant reply containing the configured marker starts the next cycle; a red-text or red-frame length warning must remain continuously detected for five seconds. Whichever early-rotation condition is first confirmed starts the next cycle; otherwise the manual timer remains in control.

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
- The GitHub API may be subject to transient upstream or proxy failures as well as rate limits. At 30 seconds the app issues about 120 polls per hour; at 90 seconds about 40; at 180 seconds about 20. The authenticated 5,000/hour primary limit is shared with other requests made on behalf of the same GitHub account. HTTP 502 is treated as a failed check and does not trigger rotation.
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
