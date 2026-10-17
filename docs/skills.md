# Landing Page Skills 选型

## 随仓库提供：Anthropic frontend-design

原始来源：[anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design)。适合明确需要改变视觉方向、字体、布局或交互的任务。它不能代替表单后端、权限和真实写入测试。

原版文件保存在 `.agents/skills/frontend-design/`，许可为 Apache 2.0，具体 commit 记录在其中的 `UPSTREAM.md`。本项目不修改原版 skill。常规配置修改遵循根目录 `AGENTS.md`，不自动触发整页重做。

## 开发参考：UI UX Pro Max

[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)，MIT。用于配色、字体、响应式、焦点和表单交互检查。模板开发时参考了它的设计建议，但没有把整套脚本与数据库打包进来，学生无需安装 Python。

推荐与最终页面不同的地方：没有真实认证、客户评价、案例或量化结果，因此不放此类内容；没有无意义的计数动画或证书轮播。

## 文案进阶：Corey Haines marketing skills

[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)，MIT。建议按需要选 `copywriting` 和转化审查相关 skill，帮助整理价值主张、标题、CTA、疑虑与下一步。这里仅提供来源链接，不自动安装整套 skills，不宣称能保证转化提升。

## 推荐顺序

先准备真实业务资料 → 填配置 → 检查页面和手机排版 → 验证提交到自己的 Sheet → 需要时再让设计 / 文案 skill 优化。更换 skill 不会自动完成 Google 授权或部署。
