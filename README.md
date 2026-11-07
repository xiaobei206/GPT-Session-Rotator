# GPT Session Rotator — Repository Entry Point

**当前版本：0.1.12**

新对话接手开发时，必须先阅读根目录的
[START-HERE-NEXT-GPT.rd](START-HERE-NEXT-GPT.rd)。

开发文档：
- [当前交接状态](docs/SESSION-HANDOFF.md)
- [开发规矩与 Git 工作流](docs/DEVELOPMENT-RULES.md)
- [项目架构](docs/PROJECT-ARCHITECTURE.md)
- [测试与发布清单](docs/TESTING-AND-RELEASE.md)
- [逐次开发日志](docs/DEVELOPMENT-LOG.md)
- [源码导入状态](docs/SOURCE-IMPORT-STATUS.md)

---

# GPT Session Rotator 0.1.12

A lightweight Windows Electron utility that repeatedly opens a fresh ChatGPT conversation, optionally selects Think, pastes a fixed prompt, submits it, and starts the next cycle when the configured wait expires or an early-rotation condition is met.

## Rotation rules

The manual wait remains the maximum wait. Use the dropdown (10, 15, 20, 25, 30, 35, 40, or 45 minutes) or enter a custom value from 1 to 1440 minutes. The 60-minute preset has been removed; 40 minutes has been added.

When automation starts, the app first reads the current `main` head of `xiaobei206/padavan-4.4-2` and records that SHA as the startup baseline. This pre-existing commit is never eligible for early rotation, regardless of its existing age; this prevents an immediate new conversation right after the first prompt is submitted. During wait windows, the app checks the branch every 90 seconds. Only a SHA that appears after the startup baseline is eligible, and it triggers once its GitHub-server-calculated commit age reaches the configured quiet threshold (15 minutes by default). A newer SHA resets the candidate. If the startup baseline request fails, the first later successful poll only establishes the baseline and cannot trigger rotation.

Commit age uses the GitHub HTTP `Date` header and the commit's committer timestamp. VPS timezone and local clock settings therefore do not enter the quiet-time calculation. If GitHub cannot be reached, returns an error, or omits a valid `Date` header, GitHub early rotation is skipped for that check and the manual timer continues normally.

GitHub requests use the embedded browser's Electron session, including the proxy configured in the app. No GitHub token is required; the endpoint is public. The monitor does not download source files or inspect commit diffs.

The Chinese/English conversation-length warning detector checks red-text or red-framed length-limit messages anywhere in the rendered ChatGPT main content DOM, including content below the current scroll viewport. The same warning must be observed continuously for five seconds before early rotation; sidebars, navigation, generic alerts, and out-of-main portals do not qualify.

The app also watches the latest assistant reply added after the current cycle submits its prompt. By default, the reply must contain `缁撴潫浠诲姟绠€鎶; the marker can be changed in the UI (up to 100 characters), persists in `settings.json`, and applies immediately during a run. Once the marker appears in the new assistant reply and generation has ended, the next cycle starts without waiting for the manual interval. Leave the field blank to disable this trigger. Older assistant replies and the user's prompt are excluded. The reply text is inspected in memory only for marker matching and is not written to logs or files.

## Kept lightweight

0.1.12 keeps the previous removal of always-on CDP diagnostics, network request/response body capture, diagnostics directories, and one-click diagnostics ZIP export. It does not record ChatGPT page bodies, API bodies, SSE content, WebSocket payloads, or DOM event timelines. The small on-screen run log remains and can still be exported manually as a TSV table. Assistant response text is never added to this log. Existing diagnostic folders from older versions are left untouched; 0.1.12 does not append to them.

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

## Notes

- The app's configured manual interval continues to run when GitHub is unreachable. A pre-existing repository head is only a baseline; if no new commit appears during this automation run, GitHub quiet-time monitoring will not shorten the current wait.
- The GitHub monitor watches only the `main` branch head and does not infer whether a coding task is complete.
- The GitHub API may be subject to unauthenticated rate limits. A 90-second poll interval is approximately 40 requests per hour while a wait window is active.
- Existing app data such as the lifetime cycle count and embedded-browser session are preserved.


### 0.1.12 鏂板琛屼负

- GitHub main 鍒嗘敮姣?90 绉掓鏌ヤ竴娆★紝闈欓粯闃堝€奸粯璁?15 鍒嗛挓锛屽彲鍦ㄤ富鐣岄潰璁句负 1鈥?80 鍒嗛挓锛涢厤缃繚瀛樺湪搴旂敤鏈湴璁剧疆鏂囦欢涓紝杩愯涓慨鏀圭珛鍗崇敓鏁堛€?- GitHub 浠嶅彧瀵规湰娆¤嚜鍔ㄨ疆鎹㈠惎鍔ㄥ悗鍑虹幇鐨勬柊 SHA 璁℃椂锛屽惎鍔ㄥ墠宸叉湁鎻愪氦涓嶈Е鍙戣疆鎹€?- 瀵硅瘽闀垮害鎻愮ず鎵弿 ChatGPT 涓诲唴瀹瑰尯鍩熷叏閮ㄥ凡娓叉煋 DOM锛屼笉鍙楀綋鍓嶆粴鍔ㄤ綅缃檺鍒讹紱涓嫳鏂囩孩瀛楁垨绾㈡鍧囨敮鎸侊紝鍚屼竴鎻愮ず杩炵画纭 5 绉掑悗鐩存帴寮€鍚柊瀵硅瘽銆?- 鏂板鍔╂墜缁撴潫鍥炴樉鏍囪锛岄粯璁も€滅粨鏉熶换鍔＄畝鎶モ€濓紱鍙娴嬫湰杞彁浜ゅ悗鏂板鐨勫姪鎵嬪洖澶嶏紝涓嶇湅鐢ㄦ埛鎻愮ず璇嶅拰鏃у洖澶嶃€傚姪鎵嬪嚭鐜版爣璁颁笖鐢熸垚缁撴潫鍚庣珛鍗冲紑鍚柊瀵硅瘽銆傛爣璁板彲鍦ㄧ晫闈㈢紪杈戙€佽嚜鍔ㄤ繚瀛樸€佽繍琛屼腑鍗虫椂鐢熸晥锛岀暀绌哄彲鍏抽棴銆?- 浜哄伐鏈€闀跨瓑寰呮椂闂翠粛淇濈暀涓哄厹搴曪紱GitHub/椤甸潰妫€娴嬪紓甯镐笉浼氳嚜鍔ㄦ殏鍋滆疆鎹€?
The GitHub quiet-time setting is stored in the app user-data directory as `settings.json`; it survives app restarts and can be changed while automation is running. The available range is 1鈥?80 whole minutes.
