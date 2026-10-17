# 配置和素材

`site.config.json` 同时供网页构建与后端验证使用。改服务选项后请重新构建并一起部署，避免页面与接口版本不一致。

## 常见修改

- **品牌**：改 `brand.name`、`englishName`、`logo`、`logoAlt`。
- **首屏**：改 `hero.title`、`description`、`primaryCta`、`image`、`imageAlt`。
- **颜色**：使用六位颜色，例如 `#087E76`。主色用于深色区域，按钮上是白字，需保持足够对比度。
- **服务**：`services.items` 每项有 `id`、`title`、`description`、`detail`、`tag`。`id` 用小写英文、数字和连字符，必须唯一；显示和写入 Sheet 的是 `title`。
- **FAQ / 流程**：直接修改数组；支持多项，注意手机文字长度。
- **SEO**：填写真实 `siteUrl`、标题、描述与分享图。演示 SVG 适合网页显示；正式社交分享图建议本地 JPEG / PNG，兼容性更好。
- **表单**：可以修改标签、提示、成功文案和服务选项。第一版固定字段，不支持从 JSON 任意添加新的数据列。

## 图片

素材放 `public/images/`，配置写 `/images/文件名.webp`，不要写电脑绝对路径。支持 SVG、PNG、JPEG、WebP、AVIF。推荐压缩后的 WebP，首图比例接近 720×760；页面会裁切以适应窄屏。Logo 推荐正方形 SVG。

模板中的 `mark.svg`、`consultation.svg` 为本项目原创示例，按 MIT 提供。请只使用你有权公开发布的素材；不要把真实客户资料放入截图。

JSON 作为文字显示，不解析 HTML。`<script>` 等内容会被转义；图片只允许本地 `/images/` 路径。图片缺失会在配置检查时报错。

## 给 Codex 的提示

> 保留模板布局。阅读 site.config.json，把品牌改成【我的品牌】，服务为【服务清单】，主要按钮改为【动作】。不要编造客户评价和数据。资料不足时先保留明确占位。只修改配置和我提供的素材，完成后运行 check 和 build。

正式收件前，将 `brand.demo=false`，并主动替换所有“虚构 / 教学示例”内容（包括 FAQ、SEO 和联系资料）。`APP_MODE` 与这个品牌提示是两个独立设置：关闭虚构提示不会自动启用真实写入。
