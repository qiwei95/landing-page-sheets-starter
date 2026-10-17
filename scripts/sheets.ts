import { HEADERS } from '../shared/leads';
import {
  googleAccessToken,
  readHeaders,
  headersMatch,
  valuesUrl,
  type GoogleCredentials,
} from '../worker/google';
const env = process.env as unknown as GoogleCredentials;
for (const key of [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_SHEET_ID',
  'GOOGLE_SHEET_TAB',
] as const)
  if (!env[key]) throw new Error(`缺少 ${key}，请配置 .dev.vars`);
const mode = process.argv[2];
if (!['check', 'init'].includes(mode))
  throw new Error('用法：npm run sheets:check 或 npm run sheets:init');
try {
  const token = await googleAccessToken(env);
  const headers = await readHeaders(env, token);
  if (headersMatch(headers))
    console.log('✓ Google 授权、工作表及 A1:N1 表头检查通过；未写入测试 Leads。');
  else if (mode === 'init' && headers.length === 0) {
    // Only initialize a truly empty A:N tab. Never overwrite existing lead data.
    const occupied = await fetch(valuesUrl(env, 'A:N'), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!occupied.ok) throw new Error(`检查工作表失败 (${occupied.status})`);
    const body = (await occupied.json()) as { values?: unknown[][] };
    if (body.values?.some((row) => row.some((cell) => String(cell).length)))
      throw new Error('工作表已有内容，初始化已停止。请使用新的空白 Leads 工作表。');
    const response = await fetch(valuesUrl(env, 'A1:N1') + '?valueInputOption=RAW', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADERS] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`初始化失败 (${response.status})`);
    console.log('✓ 已初始化表头。请继续运行 npm run sheets:check。');
  } else throw new Error('表头不匹配。请核对 docs/sheet-headers.csv；有资料时不会自动覆盖。');
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Google 连接失败');
  process.exitCode = 1;
}
