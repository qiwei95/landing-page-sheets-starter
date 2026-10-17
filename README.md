# Landing Page × Google Sheets Starter

一个给学生的中文 Landing Page 模板。修改 **一个 JSON 配置文件和图片**，就能变成自己的服务咨询页面。

**Astro 静态网页 → Cloudflare Worker → Google Sheets API → 你自己的 Google Sheet。**

默认是虚构品牌「禾序咨询」，并开启**演示模式，未写入 Google Sheet**。没有 Google / Cloudflare 账号也能先在本地运行。真实部署时，每位学生使用自己的账号、Sheet 和凭证。

## 你会得到什么

- 手机和电脑可用的首页、服务、流程、FAQ、咨询表单及资料说明。
- 姓名、电话、Email、咨询方向、内容与同意项；姓名、电话及同意项必填。
- 表单验证、提交反馈、Turnstile 服务端验证、每 IP 每分钟约 5 次限流。
- Google Sheet 表头 CSV、连接检查和空白工作表初始化命令。
- Codex 项目指引，以及附来源版本和 Apache 2.0 许可的 Anthropic `frontend-design` skill。

## 1. 复制项目

在仓库页面选择 **Use this template → Create a new repository**，为自己的项目取名。克隆你自己的仓库，再用 Codex 打开该文件夹。

准备 Node.js **22.22.0 或以上兼容版本**（建议按 `.nvmrc` 使用 22.23.1）、npm 和 Git。Windows 请用 PowerShell / Git Bash；不要把老师的电脑路径复制到命令里。

```bash
git clone https://github.com/你的账号/你的仓库.git
cd 你的仓库
npm ci
npm run dev
```

打开终端显示的 `http://127.0.0.1:8787`。看到“演示模式”后，可用虚构资料测试。演示提交**不会保存、发送或写入 Google**。

## 2. 改配置和素材

只需编辑根目录 `site.config.json`，把图片放到 `public/images/`：

| 配置区 | 可以修改的内容 |
|---|---|
| `brand` | 品牌名称、英文名、Logo、是否显示虚构品牌提示 |
| `seo` | 标题、描述、正式网址、分享图、页面语言 |
| `theme` | 主色、按钮色、背景与文字色，格式 `#RRGGBB` |
| `hero` / `value` | 首屏标题、介绍、CTA、主图与价值说明 |
| `services.items` | 服务名称、选项 id、简介和适合对象 |
| `process` / `faq` | 合作流程和常见问题 |
| `form` | 表单标签、提示、成功文案及 Turnstile **公开 site key** |
| `contact` / `footer` | 联系邮箱、地点、页脚与资料使用说明 |

例如修改 `brand.name`、`hero.title`、`theme.accent`，并把 `hero.image` 换为 `/images/my-service.webp`。JSON 不支持注释，不能多一个逗号。`\n` 可为主标题换行。配置文件**公开可见，不能放私钥或 secret key**。

```bash
npm run config:check
```

错误会指出字段路径，例如 `theme.accent`。`npm run dev` 会先构建网页，改 JSON / 图片后需停止再运行，或运行 `npm run build` 后由 Wrangler 重新载入。只设计页面时可运行 `npm run dev:design` 获得即时预览；该模式不提供表单后端，请以完整 `npm run dev` 验证提交。

发布自己的业务前，将 `brand.demo` 改为 `false`，替换虚构案例的 FAQ、联系资料及资料说明；以真实政策填写运营者、用途、保存期限和删除申请方式。不要编造客户、业绩、认证或评价。颜色改完要重新检查对比度。

更多：[配置与素材说明](docs/customize.md)。

## 3. 建立自己的 Google Sheet

1. 在自己的 Google Drive 新建空白 Google Sheet。
2. 把工作表（底部 tab）改名为 **Leads**。
3. 从网址 `https://docs.google.com/spreadsheets/d/这里是ID/edit` 取得 Spreadsheet ID。
4. 表头使用 [sheet-headers.csv](docs/sheet-headers.csv)。也可在下一步授权后运行初始化命令。

不要公开发布 Sheet，也不需要设置“知道链接的任何人可编辑”。使用一个新的教学测试 Sheet，先完成验收再收集真实资料。

## 4. 配置 Google 授权

按 [Google 设置指南](docs/google-setup.md) 完成：创建 Cloud 项目 → 启用 Google Sheets API → 创建专用 Service Account → 生成 JSON 密钥 → 把目标 Sheet 分享给该 Service Account 的邮箱并授予编辑权限。

访客无需 Google 登录。不需要域级委派，也无需授予 Service Account 整个 Cloud 项目的 Owner / Editor。

把 `.dev.vars.example` 复制为 `.dev.vars`，填自己的资料。复制文件可使用文件管理器；macOS / Linux 命令：

```bash
cp .dev.vars.example .dev.vars
```

映射关系：JSON 密钥的 `client_email` → `GOOGLE_CLIENT_EMAIL`，`private_key` → `GOOGLE_PRIVATE_KEY`。私钥保留外层双引号与 `\n`，格式参考示例。密钥 JSON 放在项目文件夹以外，`.dev.vars` 已被 Git 忽略。

```bash
npm run sheets:init
npm run sheets:check
```

`sheets:init` 只在 **Leads 的 A:N 区域完全空白**时写入表头，已有内容不会覆盖。`sheets:check` 检查授权、工作表及表头，**不代表真实报名写入已验证**。

## 5. 部署到 Cloudflare

详细步骤及排查见 [Cloudflare 部署指南](docs/cloudflare-setup.md)。本模板用 **Workers Static Assets**，不要选择只支持静态上传的部署方式。

1. 注册 / 登录自己的 Cloudflare 账号，在 **Turnstile** 新建 widget，配置正式域名；本地真实联调可另外加入 `127.0.0.1` / `localhost`。把公开 site key 填入 JSON 的 `form.turnstileSiteKey`。
2. 在 `wrangler.jsonc` 将 `name` 改为自己的项目名。每个项目设置不同的限流 `namespace_id`（数字字符串），避免与自己其他 Worker 共用额度。
3. 将 `vars.APP_MODE` 改为 `production`，保留或修改 `GOOGLE_SHEET_TAB`。
4. 登录并先部署代码。尚未设置凭证时，正式接口会拒绝收件，不会显示假成功：

```bash
npx wrangler login
npm run deploy
```

5. 在 Cloudflare Dashboard → Workers & Pages → 你的 Worker → Settings → Variables and Secrets 中，以 **Secret** 类型设置：

```text
GOOGLE_SHEET_ID
GOOGLE_CLIENT_EMAIL
GOOGLE_PRIVATE_KEY
TURNSTILE_SECRET_KEY
```

私钥粘贴原始多行值或保留 `\n` 的字符串都可以。**不要把 `.dev.vars` 提交到 GitHub**。也可用 `npx wrangler secret put GOOGLE_PRIVATE_KEY` 等命令逐个设置；不要把值放到命令行参数或聊天记录。设置后按 Dashboard 提示部署变更。

6. 确保 Turnstile 允许实际的 `你的项目.你的子域.workers.dev` 域名，或绑定后的自定义域名。将 `seo.siteUrl` 改为正式网址，再运行 `npm run deploy`。

第一次可以先用默认 `APP_MODE=demo` 部署预览，再配置真实模式。`.dev.vars` 只供本地使用，**不会自动变成线上 Secret**。线上 `APP_MODE=production` 由 `wrangler.jsonc` 的 `vars` 设置；不要把它设置成同名 Secret。

## 6. 完成真实提交验收

```bash
npm run smoke -- https://你的项目.你的子域.workers.dev
```

这个命令只检查页面和配置状态。随后用浏览器：

1. 确认不再显示“演示模式”，填写**虚构测试资料**并通过 Turnstile。
2. 提交后看到“需求已送达”和编号。
3. 打开自己的测试 Sheet，确认只新增一行，姓名、服务和 UTM 对应；`+60` / `0` 开头电话仍为文本。
4. 临时在测试环境配置错误的 Sheet ID，确认网页报失败并保留内容；恢复正确值后再验证。

写入超时可能发生在 Google 已保存之后。页面会显示结果无法确认并保留编号；请先在 Sheet 搜索 `submission_id`，确认后再决定是否重填。模板没有持久队列，也**不承诺网络异常下严格只写一次**。限流按 Cloudflare 地点执行，属于近似防刷措施；课堂共享出口 IP 可能一起触发限制。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 构建并运行完整本地演示（默认 8787） |
| `npm run dev:design` | Astro 设计热更新预览，无提交后端 |
| `npm run check` | 配置、Astro 与 Worker 类型检查 |
| `npm test` | 后端与 Google 请求模拟测试，不接触真实 Sheet |
| `npm run test:browser` | 浏览器表单、失败处理及响应式测试 |
| `npm run build` | 生成静态网页 |
| `npm run deploy` | 检查、构建并部署 Worker |
| `npm run sheets:init` | 仅初始化空白工作表表头 |
| `npm run sheets:check` | 检查 Google 连接及表头 |

首次运行浏览器测试需 `npx playwright install chromium`。GitHub Actions 会自动执行检查、模拟测试、构建和浏览器测试。它不会持有你的 Google / Cloudflare 凭证，也不会自动部署。

## Skill 与 Codex

可以对 Codex 说：

> 阅读 AGENTS.md，保留现有版式。把我的业务资料填入 site.config.json，并告诉我还缺哪些真实资料；修改后运行配置检查和构建。

只有明确要求改变布局时才使用附带的 `frontend-design`。常规改文字和图片不需要安装 skill，也不需要付费设计工具。来源与可选进阶资料见 [Skills 说明](docs/skills.md)。

## 成本与限制

按 2026-10-17 官方说明，Cloudflare 静态资源请求免费，Workers Free 每账号每天 100,000 次动态请求，并受 CPU 等资源限制；Workers Paid **US$5/月起**，超额另计。Google Sheets API 标准使用不额外收费，默认每用户每项目每分钟 60 次读请求及 60 次写请求；Service Account 按一个用户计算。本项目每次真实提交包含 OAuth、读表头和写一行，Cloudflare 请求额度不等于可接收的报名量。

域名、税、付费升级另计。本模板不购买域名、不创建付费资源，也不增加 Supabase 或其他数据库订阅。

- [Cloudflare Workers 价格](https://developers.cloudflare.com/workers/platform/pricing/)
- [静态资源计费](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Google Sheets API 配额与价格](https://developers.google.com/workspace/sheets/api/limits)
- [故障排查](docs/troubleshooting.md)
- [验收记录与已知边界](qa/verification.md)

## 许可

原创代码和示例素材使用 [MIT](LICENSE)。`.agents/skills/frontend-design/` 保留 Anthropic 原版及其 Apache 2.0 许可，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。
