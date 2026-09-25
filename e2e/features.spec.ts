import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|google\.com\/maps/, (route) => route.abort());
});

test('visa guide lists every destination with a verification date', async ({ page }) => {
  await page.goto('/ar/visa/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('التأشيرات');
  await expect(page.locator('article[id]')).toHaveCount(6);
  await expect(page.locator('#georgia')).toContainText('آخر تحقق');
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((s) => s.includes('"FAQPage"'))).toBe(true);
});

test('travel guides index and article render', async ({ page }) => {
  await page.goto('/en/guides/');
  const first = page.locator('article h3 a').first();
  const title = (await first.textContent())!.trim();
  await first.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((s) => s.includes('"BlogPosting"'))).toBe(true);
});

test('testimonials stay hidden until confirmed as genuine', async ({ page }) => {
  await page.goto('/ar/');
  await expect(page.locator('#stories')).toHaveCount(0);
});

test('language switch keeps filters in the query string', async ({ page, isMobile }) => {
  await page.goto('/ar/packages/?style=family');
  if (isMobile) await page.getByRole('button', { name: 'القائمة' }).click();
  await page
    .getByRole('link', { name: /Switch to English/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/packages\/\?style=family$/);
});

test('WhatsApp panel returns focus to its opener', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The desktop header button opens the panel');
  await page.goto('/en/');
  const opener = page.getByRole('button', { name: 'Plan your trip' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'How can we help?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test('mobile menu is modal and restores scrolling when closed', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile only');
  await page.goto('/en/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Main navigation' });
  await expect(menu).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('call-back form is available on the contact page', async ({ page }) => {
  await page.goto('/en/contact/');
  await expect(page.locator('form[name="callback"]')).toBeVisible();
});

test('localized 404 page', async ({ page }) => {
  await page.goto('/en/404/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page doesn’t exist');
});

for (const path of [
  '/ar/',
  '/en/',
  '/ar/packages/',
  '/ar/packages/istanbul-and-trabzon/',
  '/en/visa/',
  '/ar/contact/',
  '/en/guides/',
]) {
  test(`no automated accessibility violations on ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.addStyleTag({ content: '.intro-loader{display:none!important}' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test('filter sheet returns focus to the Filters button', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile only');
  await page.goto('/en/packages/');
  const opener = page.getByRole('button', { name: /^Filters/ });
  await opener.click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
});

test('menu hides the floating controls while open', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile only');
  await page.goto('/en/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('nav[data-inert-with-menu]')).toBeHidden();
  await expect(
    page.getByRole('dialog', { name: 'Main navigation' }).getByText('HOME', { exact: true }),
  ).toHaveCount(0);
});
