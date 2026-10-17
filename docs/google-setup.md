# Google Sheet 与 Service Account 设置

## 建立授权

1. 用自己的 Google 账号打开 [Google Cloud Console](https://console.cloud.google.com/)。创建一个教学项目。
2. 进入 APIs & Services → Library，搜索并启用 **Google Sheets API**。这个模板无需 Drive API。
3. 进入 IAM & Admin → Service Accounts → Create service account，例如 `landing-page-writer`。
4. 不需要为它选择项目级 Owner / Editor 角色，不要开启 domain-wide delegation。此账号只需你稍后分享的目标 Sheet。
5. 打开该 Service Account → Keys → Add key → Create new key → JSON。浏览器会下载密钥文件；妥善保存在项目以外。
6. 用表格拥有者账号打开你的测试 Sheet → Share，把 JSON 中的 `client_email` 加为 **Editor**。不要设成任何人可编辑。

若组织政策禁止建立密钥或分享给 Service Account，请由账号管理员处理；模板不会绕过组织限制。

## 本地配置

复制 `.dev.vars.example` 为 `.dev.vars`，把自己的值填入：

| 变量 | 来源 |
|---|---|
| `GOOGLE_CLIENT_EMAIL` | JSON 密钥的 `client_email` |
| `GOOGLE_PRIVATE_KEY` | JSON 密钥的 `private_key`，保留引号和 `\n` |
| `GOOGLE_SHEET_ID` | 表格网址 `/d/` 和 `/edit` 中间的 ID |
| `GOOGLE_SHEET_TAB` | 底部工作表名，默认 `Leads` |

`.dev.vars` 使用 dotenv 格式，不要把整个 Google JSON 文件粘进去。不要把私钥放在 `site.config.json` 或 `wrangler.jsonc`。

运行 `npm run sheets:init`，它只向空白 A:N 写入表头，不会建立 Spreadsheet 或工作表；请先自行建立 `Leads`。运行 `npm run sheets:check` 确认连接。表格已有内容或表头不同会停止，不自动清空或覆盖。

## 数据布局

固定 A:N 共 14 列，顺序见 [sheet-headers.csv](sheet-headers.csv)。请保持这 14 列原样；跟进状态等人工工作可放 O 列以后，不在原始收件区域排序、插行或修改列顺序。需要分析时在另一个 tab 引用原始资料。

时间为服务器生成的 UTC ISO 字符串。电话和所有输入以 `RAW` 文本写入，`+60`、开头的 `0` 和以 `=` 开头的文字不会被自动解析为公式。若之后导出 CSV 再用其他表格软件打开，仍需按该软件的导入规则处理文本。

## 正式部署与轮换

本地检查不代表 Cloudflare 已配置。线上需要另外把四个私密值放进 Cloudflare Secrets。私钥泄露时，应在 Google Cloud 删除该泄露密钥并创建替代密钥，更新线上 Secret 后重测；不要仅从当前文件中删除而忽略 Git 历史。

参考：[Google 凭证说明](https://developers.google.com/workspace/guides/create-credentials)、[Sheets API 配额](https://developers.google.com/workspace/sheets/api/limits)。
