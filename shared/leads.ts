import { z } from 'zod';
import { site } from './config';

export const HEADERS = [
  'submission_id',
  'submitted_at_utc',
  'name',
  'phone',
  'email',
  'service',
  'message',
  'page_url',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'consent',
];
export const leadSchema = z
  .object({
    submissionId: z.uuid(),
    name: z.string().trim().min(1, '请填写姓名').max(80, '姓名最多 80 字'),
    phone: z
      .string()
      .trim()
      .min(1, '请填写联系电话')
      .max(32)
      .regex(/^\+?[\d\s().-]+$/, '请填写有效电话')
      .refine(
        (v) => (v.match(/\d/g) || []).length >= 7 && (v.match(/\d/g) || []).length <= 15,
        '电话需有 7–15 位数字',
      ),
    email: z.union([z.literal(''), z.email('请检查 Email 格式')]).default(''),
    service: z
      .string()
      .max(40)
      .default('')
      .refine((v) => !v || site.services.items.some((i) => i.id === v), '请选择有效的咨询方向'),
    message: z.string().trim().max(2000, '内容最多 2000 字').default(''),
    consent: z.literal(true, { error: '请先同意资料使用说明' }),
    pageUrl: z
      .url()
      .max(2048)
      .refine((v) => /^https?:\//.test(v)),
    utm: z
      .object({
        source: z.string().max(200).default(''),
        medium: z.string().max(200).default(''),
        campaign: z.string().max(200).default(''),
        term: z.string().max(200).default(''),
        content: z.string().max(200).default(''),
      })
      .strict(),
    website: z.string().max(200).default(''),
    turnstileToken: z.string().max(2048).default(''),
  })
  .strict();
export type Lead = z.infer<typeof leadSchema>;
export function leadRow(lead: Lead, timestamp: string) {
  const service = site.services.items.find((i) => i.id === lead.service)?.title || '';
  // Store a canonical source URL, never arbitrary query parameters or fragment secrets.
  const url = new URL(lead.pageUrl);
  return [
    lead.submissionId,
    timestamp,
    lead.name,
    lead.phone,
    lead.email,
    service,
    lead.message,
    url.origin + url.pathname,
    lead.utm.source,
    lead.utm.medium,
    lead.utm.campaign,
    lead.utm.term,
    lead.utm.content,
    'true',
  ];
}
