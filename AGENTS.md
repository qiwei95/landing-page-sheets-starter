# Student template instructions

This is a configuration-first Chinese service landing page. Students primarily edit `site.config.json` and `public/images/`.

- Read the JSON and README before editing. Preserve the layout, runtime, API contract and Google Sheet headers for ordinary content/branding changes.
- Only invoke the bundled `.agents/skills/frontend-design/SKILL.md` when the student explicitly requests visual/layout changes. It is not needed for routine configuration edits.
- Never put Google private keys, Turnstile secret keys, Cloudflare tokens or real lead data in public config, browser code, fixtures, commits, logs or chat. Keep local secrets in ignored `.dev.vars` and hosted secrets in Cloudflare Secrets.
- Demo means **演示，未写入 Google Sheet**. Never silently fall back from production errors to demo success. Do not treat a simulated test or `/api/config` readiness as evidence of real Google writes.
- Do not invent customers, metrics, testimonials, certifications, discounts or guarantees. Preserve fictional/demo labels until the student supplies real content.
- `services.items[].id` is a stable value validated by frontend and backend. Keep values unique. All public content must be escaped; don't introduce raw HTML from JSON.
- After config changes run `npm run check` and `npm run build`. After handler changes also run `npm test`. Run `npm run test:browser` when form interactions or responsive layout change.
- Do not automatically retry Google append requests. Preserve submission ids and explain uncertainty on timeouts. Do not promise exactly-once delivery without persistent coordination.
- Do not add paid resources, editors, auth, CRM, payments or another database to a routine customization.
- Do not edit upstream skill files; keep their license and pinned provenance.
