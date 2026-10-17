# 验收记录

日期：2026-10-17（Asia/Kuala_Lumpur）。

## 已验证

- Node 22.23.1；依赖锁定到 package-lock.json；安装审计没有已知漏洞。
- `npm run check`：配置、素材、Astro 与 Worker 类型检查通过，0 errors / warnings / hints。
- `npm test`：25 项通过。覆盖必填项、电话与 Email、同意项、来源校验、未知服务、过大请求、验证码失败 / hostname / action、限流、Google 403 / 429、写入超时及表头不匹配。
- Google 协议测试使用本地生成的测试 RSA key 和模拟网络，检查 OAuth 签名请求、表头读取与 RAW 单行写入；不是实际 Google 服务验收。
- `npm run test:browser`：7 项通过。验证 demo 明示、栏目错误与焦点、服务选择、FAQ 键盘操作、失败保留输入、未知结果阻止重复重试、重复点击只发送一次、正式配置缺失拒绝收件，以及模拟的正式成功反馈。
- 375 / 768 / 1024 / 1440px 无横向溢出；可见图片正确加载。已人工检查电脑和手机整页截图。
- `npm run build` 和 `wrangler deploy --dry-run` 通过，Assets 与限流绑定正确打包。
- 本地 `smoke` 返回页面 200、demo、ready；只修改 JSON 后，品牌、标题、配色在生成 HTML 中正确变化，随后恢复原始示例并重新构建。
- 从仅含项目文件的全新副本运行 `npm ci`、`npm run check`、`npm test`、`npm run build` 均通过；不依赖原文件夹的 node_modules 或缓存输出。

## 尚未验证

- 未提供项目专用 Google / Turnstile 凭证，**真实 Google Sheet 写入尚未验证**。
- 未向 Cloudflare 生产账号部署；学生需按 README 配置自己的账号、Secrets 和 Turnstile。
- 前端 production 成功测试和 Google 请求测试均为模拟，不能据此宣称正式收件已上线。

## 已知边界

- Google append 不自动重试，无持久队列或严格 exactly-once 保证。网络超时时按 submission_id 查询 Sheet。
- 限流按 IP、Cloudflare 地点近似计数；课堂共享网络可能一起触发。
- 示例品牌、联系邮箱及服务均为教学占位；正式使用前需换成真实内容与资料政策。
- 默认演示模式不保存 Leads。APP_MODE 与 brand.demo 是独立设置。
- 表单固定 14 列；跟进字段放 O 列之后。配置服务或文案后需重新构建和部署。
