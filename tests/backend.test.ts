import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { site, parseSite } from '../shared/config';
import { HEADERS, leadRow, leadSchema } from '../shared/leads';
import { handleRequest, type Env } from '../worker/index';
import { appendLead, UpstreamError, type Fetcher } from '../worker/google';

const valid = () => ({
  submissionId: crypto.randomUUID(),
  name: '测试用户',
  phone: '+60 12 345 6789',
  email: 'test@example.com',
  service: 'positioning',
  message: '仅供自动测试',
  consent: true,
  pageUrl: 'https://example.com/',
  utm: { source: 'test', medium: '', campaign: '', term: '', content: '' },
  website: '',
  turnstileToken: 'token',
});
const makeEnv = (mode = 'demo') =>
  ({
    APP_MODE: mode,
    GOOGLE_CLIENT_EMAIL: 'test@test.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
    GOOGLE_SHEET_ID: 'sheet',
    GOOGLE_SHEET_TAB: 'Leads',
    TURNSTILE_SECRET_KEY: 'test',
    LEAD_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    ASSETS: { fetch: vi.fn(async () => new Response('asset')) },
  }) as Env;
function req(data: unknown = valid(), headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/leads', {
    method: 'POST',
    headers: { Origin: 'https://example.com', 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
}
const verification = vi.fn(async () =>
  Response.json({ success: true, hostname: 'example.com', action: 'lead' }),
) as unknown as Fetcher;
const originalKey = site.form.turnstileSiteKey;
beforeEach(() => {
  site.form.turnstileSiteKey = 'test-key';
  vi.clearAllMocks();
});
afterEach(() => {
  site.form.turnstileSiteKey = originalKey;
});

describe('configuration and field safety', () => {
  it('names invalid configuration paths', () => {
    expect(() =>
      parseSite({ ...site, theme: { ...site.theme, accent: 'javascript:alert(1)' } }),
    ).toThrow('theme.accent');
  });
  it('rejects duplicate service ids and asset traversal', () => {
    expect(() =>
      parseSite({
        ...site,
        services: { ...site.services, items: [site.services.items[0], site.services.items[0]] },
      }),
    ).toThrow('services.items');
    expect(() =>
      parseSite({ ...site, hero: { ...site.hero, image: '/images/../../secret.svg' } }),
    ).toThrow('hero.image');
  });
  it.each(['', '123', 'hello', '+1234567890123456'])('rejects invalid phone %s', (phone) => {
    expect(leadSchema.safeParse({ ...valid(), phone }).success).toBe(false);
  });
  it('preserves plus signs, leading zeros and literal formula text', () => {
    const lead = leadSchema.parse({
      ...valid(),
      phone: '0123456789',
      message: '=IMPORTXML("x")',
      pageUrl: 'https://example.com/?private=secret#token',
    });
    const row = leadRow(lead, '2026-10-17T00:00:00Z');
    expect(row[3]).toBe('0123456789');
    expect(row[6]).toBe('=IMPORTXML("x")');
    expect(row[7]).toBe('https://example.com/');
    expect(row).toHaveLength(HEADERS.length);
  });
});
describe('lead endpoint', () => {
  it('demo never calls Google or verification', async () => {
    const append = vi.fn();
    const r = await handleRequest(req(), makeEnv(), { append, fetcher: verification });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, mode: 'demo' });
    expect(append).not.toHaveBeenCalled();
    expect(verification).not.toHaveBeenCalled();
  });
  it('fails closed when production setup is missing', async () => {
    const env = makeEnv('production');
    env.GOOGLE_PRIVATE_KEY = '';
    expect((await handleRequest(req(), env)).status).toBe(503);
  });
  it('does not infer demo from missing mode', async () => {
    const env = makeEnv();
    env.APP_MODE = undefined;
    expect((await handleRequest(req(), env)).status).toBe(503);
  });
  it('rejects wrong origin and wrong page source', async () => {
    expect(
      (await handleRequest(req(valid(), { Origin: 'https://attacker.test' }), makeEnv())).status,
    ).toBe(403);
    expect(
      (await handleRequest(req({ ...valid(), pageUrl: 'https://attacker.test' }), makeEnv()))
        .status,
    ).toBe(400);
  });
  it('returns field errors for missing required fields and consent', async () => {
    const r = await handleRequest(
      req({ ...valid(), name: '', phone: '', consent: false, email: 'bad' }),
      makeEnv(),
    );
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).fields).toHaveProperty('name');
  });
  it('rejects unknown service and spam honeypot', async () => {
    expect((await handleRequest(req({ ...valid(), service: 'forged' }), makeEnv())).status).toBe(
      400,
    );
    expect((await handleRequest(req({ ...valid(), website: 'spam' }), makeEnv())).status).toBe(400);
  });
  it('rejects malformed, oversized bodies, wrong content type and method', async () => {
    expect(
      (
        await handleRequest(
          new Request('https://example.com/api/leads', {
            method: 'POST',
            headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
            body: '{',
          }),
          makeEnv(),
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleRequest(req({ ...valid(), message: 'a'.repeat(17000) }), makeEnv())).status,
    ).toBe(413);
    expect(
      (await handleRequest(req(valid(), { 'Content-Type': 'text/plain' }), makeEnv())).status,
    ).toBe(415);
    expect(
      (await handleRequest(new Request('https://example.com/api/leads'), makeEnv())).status,
    ).toBe(405);
  });
  it('rate limits before any write', async () => {
    const env = makeEnv();
    env.LEAD_RATE_LIMITER.limit = vi.fn(async () => ({ success: false }));
    const r = await handleRequest(req(), env);
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('60');
  });
  it.each([
    { success: false },
    { success: true, hostname: 'wrong.test', action: 'lead' },
    { success: true, hostname: 'example.com', action: 'other' },
  ])('rejects invalid Turnstile result %j', async (data) => {
    const append = vi.fn();
    const r = await handleRequest(req(), makeEnv('production'), {
      fetcher: vi.fn(async () => Response.json(data)) as any,
      append,
    });
    expect(r.status).toBe(400);
    expect(append).not.toHaveBeenCalled();
  });
  it('rejects missing token and unavailable verification', async () => {
    expect(
      (await handleRequest(req({ ...valid(), turnstileToken: '' }), makeEnv('production'))).status,
    ).toBe(400);
    expect(
      (
        await handleRequest(req(), makeEnv('production'), {
          fetcher: vi.fn(async () => {
            throw new Error('timeout');
          }) as any,
        })
      ).status,
    ).toBe(503);
  });
  it('reports success only after confirmed append', async () => {
    const append = vi.fn(async () => {});
    const r = await handleRequest(req(), makeEnv('production'), { fetcher: verification, append });
    expect(r.status).toBe(200);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][1][3]).toBe('+60 12 345 6789');
  });
  it.each([403, 429])('handles Google error %s without leaking internals', async (code) => {
    const append = vi.fn(async () => {
      throw new UpstreamError(code, 'append');
    });
    const r = await handleRequest(req(), makeEnv('production'), { fetcher: verification, append });
    expect(r.status).toBe(code === 429 ? 503 : 502);
    expect(await r.json()).toMatchObject({ ok: false, uncertain: false });
    expect(append).toHaveBeenCalledTimes(1);
  });
  it('retains submission id on uncertain write, with no automatic retry', async () => {
    const lead = valid();
    const append = vi.fn(async () => {
      throw new DOMException('Timeout', 'TimeoutError');
    });
    const r = await handleRequest(req(lead), makeEnv('production'), {
      fetcher: verification,
      append,
    });
    expect(await r.json()).toMatchObject({
      ok: false,
      uncertain: true,
      submissionId: lead.submissionId,
    });
    expect(append).toHaveBeenCalledTimes(1);
  });
});
describe('real Google request construction with local mocked transport', () => {
  async function credentials() {
    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );
    const bytes = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    return {
      ...makeEnv('production'),
      GOOGLE_PRIVATE_KEY:
        '-----BEGIN PRIVATE KEY-----\n' +
        btoa(String.fromCharCode(...bytes)) +
        '\n-----END PRIVATE KEY-----',
    };
  }
  it('signs OAuth assertion, checks headers, and appends RAW once', async () => {
    const env = await credentials();
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (calls.length === 1) return Response.json({ access_token: 'mock-token' });
      if (calls.length === 2) return Response.json({ values: [HEADERS] });
      return Response.json({ updates: { updatedRows: 1 } });
    }) as unknown as Fetcher;
    await appendLead(env, leadRow(leadSchema.parse(valid()), new Date().toISOString()), fetcher);
    expect(calls).toHaveLength(3);
    expect(String(calls[0].init?.body)).toContain('assertion=');
    expect(calls[2].url).toContain('valueInputOption=RAW');
    expect(JSON.parse(String(calls[2].init?.body)).values[0][3]).toBe('+60 12 345 6789');
  });
  it('refuses mismatched headers before appending', async () => {
    const env = await credentials();
    let count = 0;
    const fetcher = vi.fn(async () =>
      ++count === 1
        ? Response.json({ access_token: 'mock' })
        : Response.json({ values: [['wrong']] }),
    ) as any;
    await expect(appendLead(env, [], fetcher)).rejects.toMatchObject({
      status: 409,
      stage: 'headers',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
