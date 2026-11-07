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
