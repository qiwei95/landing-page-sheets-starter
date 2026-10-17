import { site } from '../../shared/config';
import { leadSchema } from '../../shared/leads';

interface Turnstile {
  render(node: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
const form = document.querySelector<HTMLFormElement>('#lead-form')!;
const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const label = document.querySelector<HTMLElement>('#submit-label')!;
const banner = document.querySelector<HTMLElement>('#mode-banner')!;
const status = document.querySelector<HTMLElement>('#form-status')!;
let info: { mode: string; ready: boolean; siteKey: string } | undefined;
let token = '';
let widget: string | undefined;
let busy = false;
let completed = false;
let uncertain = false;
let submissionId = crypto.randomUUID();
function message(text: string, error = false) {
  status.textContent = text;
  status.hidden = false;
  status.classList.toggle('error', error);
  status.setAttribute('role', error ? 'alert' : 'status');
}
function errors(fields: Record<string, string> = {}) {
  form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  for (const [key, value] of Object.entries(fields)) {
    const error = document.getElementById(key + '-error');
    if (error) error.textContent = value;
    document.getElementById(key)?.setAttribute('aria-invalid', 'true');
  }
}
async function initialize() {
  try {
    const response = await fetch('/api/config', {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error();
    info = await response.json();
    if (!info?.ready) throw new Error();
    if (info.mode === 'demo') {
      banner.textContent = site.form.demoBanner;
      button.disabled = false;
      return;
    }
    banner.textContent = '资料将用于回复本次咨询，并保存至网站运营者的 Google Sheet。';
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onerror = () => {
      banner.textContent = '验证服务未能载入，请刷新或使用联系邮箱。';
    };
    script.onload = () => {
      widget = window.turnstile!.render(document.getElementById('verification')!, {
        sitekey: info!.siteKey,
        action: 'lead',
        callback: (value: string) => {
          token = value;
          button.disabled = busy || completed || uncertain;
        },
        'expired-callback': () => {
          token = '';
          button.disabled = true;
        },
        'error-callback': () => {
          token = '';
          button.disabled = true;
          message('验证未完成，请刷新后再试。', true);
        },
      });
    };
    document.head.append(script);
  } catch {
    banner.textContent = '收件功能暂未就绪。设计预览请使用 npm run dev，或通过页面邮箱联系。';
  }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || completed || uncertain || !info?.ready) return;
  errors();
  status.hidden = true;
  const data = new FormData(form);
  const params = new URLSearchParams(location.search);
  const input = {
    submissionId,
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    email: String(data.get('email') || '').trim(),
    service: String(data.get('service') || ''),
    message: String(data.get('message') || '').trim(),
    consent: data.get('consent') === 'on',
    pageUrl: location.origin + location.pathname,
    website: String(data.get('website') || ''),
    turnstileToken: token,
    utm: {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      term: params.get('utm_term') || '',
      content: params.get('utm_content') || '',
    },
  };
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message;
    errors(fields);
    message('请检查标记的栏目。', true);
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  if (info.mode !== 'demo' && !token) {
    errors({ verification: '请完成验证后再提交。' });
    return;
  }
  busy = true;
  button.disabled = true;
  label.textContent = site.form.submittingLabel;
  form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(35000),
    });
    let result: {
      ok: boolean;
      mode?: string;
      message?: string;
      fields?: Record<string, string>;
      uncertain?: boolean;
    };
    try {
      result = await response.json();
    } catch {
      throw new Error('unconfirmed');
    }
    if (!response.ok || !result.ok) {
      errors(result.fields);
      uncertain = !!result.uncertain;
      message(
        (result.message || '提交失败，请稍后再试。') +
          (response.status >= 500 ? ` 编号：${submissionId}` : ''),
        true,
      );
      status.focus();
      return;
    }
    if (result.mode !== info.mode) throw new Error('unconfirmed');
    message(
      info.mode === 'demo'
        ? `${site.form.demoTitle}。${site.form.demoMessage}`
        : `${site.form.successTitle}。${site.form.successMessage} 编号：${submissionId}`,
    );
    completed = info.mode !== 'demo';
    if (!completed) submissionId = crypto.randomUUID();
    status.focus();
  } catch {
    uncertain = true;
    message(
      `无法确认提交结果，请通过联系邮箱查询，避免重复提交。输入内容已保留。编号：${submissionId}`,
      true,
    );
    status.focus();
  } finally {
    busy = false;
    form.removeAttribute('aria-busy');
    label.textContent = site.form.submitLabel;
    if (widget && window.turnstile) {
      token = '';
      window.turnstile.reset(widget);
    }
    button.disabled = completed || uncertain || (info.mode !== 'demo' && !token);
  }
});
document.querySelectorAll<HTMLAnchorElement>('[data-service]').forEach((link) =>
  link.addEventListener('click', () => {
    (document.getElementById('service') as HTMLSelectElement).value = link.dataset.service!;
  }),
);
document.querySelector('a[href="#privacy"]')?.addEventListener('click', () => {
  (document.getElementById('privacy') as HTMLDetailsElement).open = true;
});
void initialize();
