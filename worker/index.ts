import { site } from '../shared/config';
import { leadSchema, leadRow } from '../shared/leads';
import { appendLead, UpstreamError, type GoogleCredentials, type Fetcher } from './google';

export interface Env extends GoogleCredentials {
  APP_MODE?: string;
  TURNSTILE_SECRET_KEY: string;
  LEAD_RATE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
  ASSETS: { fetch(request: Request): Promise<Response> };
}
interface Dependencies {
  fetcher?: Fetcher;
  append?: typeof appendLead;
}
function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}
function configured(env: Env) {
  return !!(
    env.GOOGLE_CLIENT_EMAIL?.endsWith('.iam.gserviceaccount.com') &&
    env.GOOGLE_PRIVATE_KEY?.includes('PRIVATE KEY') &&
    env.GOOGLE_SHEET_ID &&
    env.GOOGLE_SHEET_TAB &&
    env.TURNSTILE_SECRET_KEY &&
    site.form.turnstileSiteKey &&
    env.LEAD_RATE_LIMITER
  );
}
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new Error('large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(body));
}
export async function handleRequest(
  request: Request,
  env: Env,
  deps: Dependencies = {},
): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  const demo = env.APP_MODE === 'demo';
  const ready = demo || (env.APP_MODE === 'production' && configured(env));
  if (url.pathname === '/api/config' && request.method === 'GET')
    return json({
      mode: demo ? 'demo' : 'production',
      ready,
      siteKey: ready && !demo ? site.form.turnstileSiteKey : '',
    });
  if (url.pathname !== '/api/leads') return json({ ok: false, message: '找不到这个接口。' }, 404);
  if (request.method !== 'POST')
    return json({ ok: false, message: '请使用 POST 提交。' }, 405, { Allow: 'POST' });
  if (request.headers.get('origin') !== url.origin)
    return json({ ok: false, message: '请从本网站提交表单。' }, 403);
  if (!ready)
    return json({ ok: false, message: '收件功能尚未配置完成，请使用页面上的联系邮箱。' }, 503);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return json({ ok: false, message: '提交格式不正确。' }, 415);
  if (env.LEAD_RATE_LIMITER) {
    const result = await env.LEAD_RATE_LIMITER.limit({
      key: request.headers.get('CF-Connecting-IP') || 'local',
    });
    if (!result.success)
      return json({ ok: false, message: '提交过于频繁，请一分钟后再试。' }, 429, {
        'Retry-After': '60',
      });
  }
  let input: unknown;
  try {
    input = await readBody(request);
  } catch (e) {
    return json(
      {
        ok: false,
        message:
          e instanceof Error && e.message === 'large'
            ? '内容过长，请缩短后再试。'
            : '无法读取表单资料，请重新提交。',
      },
      e instanceof Error && e.message === 'large' ? 413 : 400,
    );
  }
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fields[String(issue.path[0] || 'form')] = issue.message;
    return json({ ok: false, message: '请检查表单内容。', fields }, 400);
  }
  const lead = parsed.data;
  if (lead.website) return json({ ok: false, message: '无法接受这次提交。' }, 400);
  if (new URL(lead.pageUrl).origin !== url.origin)
    return json({ ok: false, message: '页面来源不正确。' }, 400);
  if (demo) return json({ ok: true, mode: 'demo', submissionId: lead.submissionId });
  if (!lead.turnstileToken)
    return json(
      {
        ok: false,
        message: '请完成验证后再提交。',
        fields: { verification: '请完成验证后再提交。' },
      },
      400,
    );
  const fetcher = deps.fetcher || fetch;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: lead.turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') || '',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json({ ok: false, message: '验证服务暂时不可用，请稍后再试。' }, 503);
    const check = (await response.json()) as {
      success: boolean;
      hostname?: string;
      action?: string;
    };
    if (!check.success || check.hostname !== url.hostname || check.action !== 'lead')
      return json(
        {
          ok: false,
          message: '验证已失效，请重新验证。',
          fields: { verification: '验证已失效，请重新验证。' },
        },
        400,
      );
  } catch {
    return json({ ok: false, message: '验证服务连接失败，请稍后再试。' }, 503);
  }
  try {
    await (deps.append || appendLead)(env, leadRow(lead, new Date().toISOString()), fetcher);
    return json({ ok: true, mode: 'production', submissionId: lead.submissionId });
  } catch (e) {
    // Log diagnostic codes only; never keys, submitted PII or Google response bodies.
    console.error(
      JSON.stringify({
        event: 'lead_write_failed',
        submissionId: lead.submissionId,
        stage: e instanceof UpstreamError ? e.stage : 'connection',
        status: e instanceof UpstreamError ? e.status : 0,
      }),
    );
    const knownRejection =
      e instanceof UpstreamError &&
      (e.stage !== 'append' || [400, 401, 403, 404, 409, 429].includes(e.status));
    return json(
      {
        ok: false,
        submissionId: lead.submissionId,
        uncertain: !knownRejection,
        message: knownRejection
          ? '暂时无法保存资料，请保留编号并通过联系邮箱咨询。'
          : '保存结果暂时无法确认。请保留编号并联系网站运营者确认，避免重复提交。',
      },
      e instanceof UpstreamError && e.status === 429 ? 503 : 502,
    );
  }
}
export default {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
