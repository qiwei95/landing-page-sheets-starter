# 故障排查

| 现象 | 检查方式 |
|---|---|
| `npm ci` 提示 Node 版本不符 | 使用 Node 22.22.0 以上兼容版本，建议 `.nvmrc` 指定版本 |
| 配置报 `theme.accent` 等路径 | 按路径修正字段，JSON 不允许注释和尾逗号 |
| 图片不存在 | 路径须为 `/images/...`，文件放 `public/images/`，注意大小写 |
| 改配置后看不到变化 | `npm run dev` 先构建；停止后重跑，或另开终端运行 build；线上需重新 deploy |
| 页面显示演示成功，Sheet 没资料 | 正常：demo 不写入。检查线上 `APP_MODE`，不要只改品牌提示 |
| “收件功能尚未配置完成” | 查 mode、四个 Secrets、Sheet tab、Turnstile site key 和限流绑定；本地变量不会自动上传 |
| Turnstile 无法完成 | 检查真实 hostname 允许列表、site key / secret key 对应关系、浏览器扩展；不能绕过验证码 |
| 验证已失效 | token 一次性使用；页面会重置验证码，重做后再提交 |
| 429 / 提交过于频繁 | 等一分钟；同一 Wi-Fi 的学生可能共用出口 IP |
| OAuth 401 / invalid grant | 检查 Service Account 邮箱、私钥格式、密钥是否被删除，电脑时间是否正常 |
| Google 403 | 确认启用 Sheets API、Sheet 分享给准确的 Service Account 邮箱且有编辑权限 |
| Google 404 | 检查 Spreadsheet ID 与该账号是否有权限 |
| Google 400 / headers | 检查 tab 名和 A1:N1 表头，不要修改固定 14 列 |
| Google 429 | 达到 Google 配额，减少提交频率；模板不会自动重试 append |
| 保存结果无法确认 | 先在 Sheet 搜索页面显示的提交编号，确认后再决定是否重试 |
| `ready=true` 但提交失败 | ready 只检查基本配置；Google 连接和真实写入要另行验证 |
| 设计预览表单不可用 | `dev:design` 只有 Astro，完整提交需 `npm run dev` |
| 浏览器测试找不到 Chromium | 运行 `npx playwright install chromium`，CI 使用 `--with-deps` |

可以向 Codex 提供：不包含个人资料的错误截图、HTTP 状态、提交编号及配置字段名。**不要贴私钥、secret key、完整 `.dev.vars` 或真实 Leads。**
