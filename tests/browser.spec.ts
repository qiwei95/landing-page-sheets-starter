import { test, expect } from '@playwright/test';
async function fill(page: any) {
  await page.getByLabel('怎么称呼你').fill('测试同学');
  await page.getByLabel('联系电话').fill('0123456789');
  await page.getByLabel('我同意提供以上资料').check();
}
test('demo, validation, keyboard and service choice', async ({ page }) => {
  await page.goto('/?utm_source=class');
  await expect(page.locator('#mode-banner')).toContainText('演示模式');
  await page.getByRole('button', { name: '提交咨询需求' }).click();
  await expect(page.locator('#name-error')).toContainText('姓名');
  await expect(page.locator('#name')).toBeFocused();
  await page.locator('[data-service="communication"]').click();
  await expect(page.locator('#service')).toHaveValue('communication');
  await fill(page);
  await page.getByRole('button', { name: '提交咨询需求' }).click();
  await expect(page.locator('#form-status')).toContainText('未写入 Google Sheet');
  const faq = page.locator('#faq summary').first();
  await faq.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#faq details').first()).toHaveAttribute('open', '');
});
test('write failure retains input and does not report success', async ({ page }) => {
  await page.route('**/api/leads', (route) =>
    route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: '测试：Google 权限不足', uncertain: false }),
    }),
  );
  await page.goto('/');
  await expect(page.locator('#mode-banner')).toContainText('演示模式');
  await fill(page);
  await page.getByRole('button', { name: '提交咨询需求' }).click();
  await expect(page.locator('#form-status')).toContainText('Google 权限不足');
  await expect(page.locator('#phone')).toHaveValue('0123456789');
  await expect(page.locator('#form-status')).not.toContainText('需求已送达');
});
test('uncertain network result prevents duplicate retries', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/leads', (route) => {
    requests++;
    return route.abort();
  });
  await page.goto('/');
  await expect(page.locator('#mode-banner')).toContainText('演示模式');
  await fill(page);
  await page.getByRole('button', { name: '提交咨询需求' }).click();
  await expect(page.locator('#form-status')).toContainText('无法确认提交结果');
  await expect(page.getByRole('button', { name: '提交咨询需求' })).toBeDisabled();
  expect(requests).toBe(1);
  await expect(page.locator('#name')).toHaveValue('测试同学');
});
test('double submit sends only one request while pending', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/leads', async (route) => {
    requests++;
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, mode: 'demo' }),
    });
  });
  await page.goto('/');
  await expect(page.locator('#mode-banner')).toContainText('演示模式');
  await fill(page);
  await page.locator('#lead-form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#form-status')).toContainText('演示提交完成');
  expect(requests).toBe(1);
});
test('desktop and mobile layout, images and screenshots', async ({ page }) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('#mode-banner')).toContainText('演示模式');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const image of await page.locator('img').all())
      if (await image.isVisible()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (img) =>
                (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
    await page.evaluate(() => scrollTo(0, 0));
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `qa/${width === 375 ? 'mobile' : 'desktop'}.png`,
        fullPage: true,
      });
  }
});
test('missing production configuration disables collection', async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'production', ready: false, siteKey: '' }),
    }),
  );
  await page.goto('/');
  await expect(page.locator('#mode-banner')).toContainText('暂未就绪');
  await expect(page.getByRole('button', { name: '提交咨询需求' })).toBeDisabled();
});
test('production UI waits for verification and displays confirmed success', async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'production', ready: true, siteKey: 'test' }),
    }),
  );
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'window.turnstile={render:function(node,options){options.callback("test-token");return "widget";},reset:function(){}};',
      }),
  );
  await page.route('**/api/leads', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, mode: 'production' }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: '提交咨询需求' })).toBeEnabled();
  await fill(page);
  await page.getByRole('button', { name: '提交咨询需求' }).click();
  await expect(page.locator('#form-status')).toContainText('需求已送达');
  await expect(page.getByRole('button', { name: '提交咨询需求' })).toBeDisabled();
});
