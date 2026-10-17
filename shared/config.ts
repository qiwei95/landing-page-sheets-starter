import { z } from 'zod';
import raw from '../site.config.json';

const text = z.string().trim().min(1).max(2000);
const short = z.string().trim().min(1).max(120);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, '请使用 #RRGGBB 六位颜色');
const asset = z
  .string()
  .regex(
    /^\/images\/[a-zA-Z0-9_./-]+\.(svg|png|jpg|jpeg|webp|avif)$/i,
    '请使用 /images/ 下的本地图片',
  )
  .refine((v) => !v.includes('..'), '图片路径不能包含 ..');
const item = z.object({ title: short, description: text }).strict();
export const siteSchema = z
  .object({
    brand: z
      .object({
        name: short,
        englishName: short,
        logo: asset,
        logoAlt: short,
        demo: z.boolean(),
        demoNotice: text,
      })
      .strict(),
    seo: z
      .object({
        title: short,
        description: text,
        siteUrl: z.url().refine((v) => /^https?:\//.test(v)),
        image: asset,
        lang: short,
      })
      .strict(),
    theme: z
      .object({ primary: color, accent: color, background: color, surface: color, text: color })
      .strict(),
    nav: z.object({ services: short, process: short, faq: short, cta: short }).strict(),
    hero: z
      .object({
        eyebrow: short,
        title: text,
        description: text,
        primaryCta: short,
        secondaryCta: short,
        image: asset,
        imageAlt: text,
        imageCaption: text,
        note: text,
      })
      .strict(),
    value: z
      .object({ label: short, title: text, description: text, items: z.array(item).min(1).max(6) })
      .strict(),
    services: z
      .object({
        label: short,
        title: text,
        description: text,
        items: z
          .array(
            item.extend({
              id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
              detail: text,
              tag: short,
            }),
          )
          .min(1)
          .max(8)
          .refine(
            (items) => new Set(items.map((i) => i.id)).size === items.length,
            '服务 id 不能重复',
          ),
      })
      .strict(),
    process: z.object({ label: short, title: text, items: z.array(item).min(1).max(6) }).strict(),
    faq: z
      .object({
        label: short,
        title: text,
        items: z
          .array(z.object({ question: short, answer: text }).strict())
          .min(1)
          .max(12),
      })
      .strict(),
    form: z
      .object({
        title: text,
        description: text,
        nameLabel: short,
        namePlaceholder: short,
        phoneLabel: short,
        phonePlaceholder: short,
        emailLabel: short,
        emailPlaceholder: short,
        serviceLabel: short,
        servicePlaceholder: short,
        messageLabel: short,
        messagePlaceholder: text,
        consentText: text,
        submitLabel: short,
        submittingLabel: short,
        successTitle: short,
        successMessage: text,
        demoTitle: short,
        demoMessage: text,
        demoBanner: text,
        privacyLinkText: short,
        turnstileSiteKey: z
          .string()
          .max(100)
          .regex(/^[a-zA-Z0-9_-]*$/),
      })
      .strict(),
    contact: z.object({ email: z.email(), location: short, note: text }).strict(),
    footer: z
      .object({ tagline: text, copyright: text, privacyTitle: short, privacyText: text })
      .strict(),
  })
  .strict();

export function parseSite(input: unknown) {
  const result = siteSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      'site.config.json 配置错误：\n' +
        result.error.issues
          .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('\n'),
    );
  return result.data;
}
export const site = parseSite(raw);
