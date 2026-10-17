const base = process.argv[2];
if (!base) throw new Error('用法：npm run smoke -- https://你的网址（只读检查，不提交 Leads）');
const origin = new URL(base).origin;
const page = await fetch(origin);
const config = await fetch(origin + '/api/config');
if (!page.ok || !config.ok)
  throw new Error(`HTTP 检查失败：页面 ${page.status}；API ${config.status}`);
const info = (await config.json()) as { mode: string; ready: boolean };
console.log(JSON.stringify({ page: page.status, ...info }, null, 2));
if (!info.ready) process.exitCode = 1;
console.log('此检查未验证真实 Google Sheet 写入。请按 README 完成一次浏览器测试提交并核对 Sheet。');
