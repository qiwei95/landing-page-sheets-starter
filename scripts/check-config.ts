import { existsSync } from 'node:fs';
import { site } from '../shared/config';
for (const path of [site.brand.logo, site.hero.image, site.seo.image]) {
  if (!existsSync(new URL('../public' + path, import.meta.url)))
    throw new Error(`site.config.json 图片不存在：${path}`);
}
console.log('✓ site.config.json 字段与本地素材检查通过');
