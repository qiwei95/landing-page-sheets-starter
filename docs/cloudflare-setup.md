# Cloudflare 部署与真实模式

本项目使用一个 Worker：静态网页由 Assets 提供，只有 `/api/*` 进入后端。Google Sheet 是资料储存位置，Cloudflare 没有另外保存 Leads。

## 最短部署路径

1. 在本地完成 `npm ci`，复制并修改 `site.config.json`。
2. 修改 `wrangler.jsonc` 的 `name`，用小写英文字母、数字和连字符，设为自己的项目名。
3. 执行 `npx wrangler login`，在浏览器完成自己账号的登录与授权。
4. 运行 `npm run deploy`。默认 demo，不需真实凭证即可预览。终端会显示 workers.dev 网址。
5. 如果账号尚未开通 workers.dev 子域，按 Cloudflare Dashboard 的提示选择自己的子域。

## Turnstile

在 Cloudflare Dashboard → Turnstile 新建一个 Managed widget，把正式网站主机名加入允许列表。site key 是公开值，放 `site.config.json` 的 `form.turnstileSiteKey`；secret key 放线上 Secret。

本地真实联调使用单独允许 `127.0.0.1` / `localhost` 的 widget。不要在正式项目使用测试 site key / secret key。后端强制检查成功状态、`hostname` 与 `action=lead`，仅把一个验证码组件画在前端并不足够。

## 正式配置

将 `wrangler.jsonc` 中 `vars.APP_MODE` 改为 `production`，`GOOGLE_SHEET_TAB` 按实际填写。把 `seo.siteUrl` 改为正式网址。部署后，在 Worker → Settings → Variables and Secrets 设置以下 **Secret**，再部署变更：

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `TURNSTILE_SECRET_KEY`

也可使用 `npx wrangler secret put 变量名`，在提示时输入值。不要把密钥硬编码或作为终端命令参数。Worker 名字变更后，Secret 属于旧 Worker，不会自动迁移。

`APP_MODE` 只有明确的 `demo` 才能演示；`production` 缺配置时返回 503，其他或缺失模式也拒绝收件。`/api/config` 只提供模式、基本配置状态和公开 site key，不暴露 Google 凭证。`ready=true` 仅代表配置齐备，不代表 Google 权限或写入已经验证。

## 限流与日志

`ratelimits` 绑定每 IP 每分钟约 5 次。它按 Cloudflare 数据中心计数，属于近似限制，不能保证全球严格唯一计数。若同一课堂共用 Wi-Fi 出口，可能共享限制；教学联调可适度调高 `limit`，公开收件后恢复适合的限制。每个 Worker 使用独立数字 `namespace_id`。

日志仅写故障阶段、上游状态和提交编号，不打印表单资料、私钥、Google token 或完整上游响应。

## 回滚与提交失败

修改前保留 Git commit。出错时先看 Cloudflare 部署和运行日志，必要时在 Dashboard 回滚版本。Google 返回失败不会伪装成功；无法确认写入结果时，在 Sheet 按提交编号搜索，先确认再重试。Secrets 变更与代码版本并非同一份内容，回滚后仍需检查配置。

参考：[Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/)、[Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[Turnstile 服务端验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)、[限流绑定](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。
