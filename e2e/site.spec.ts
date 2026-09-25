import { expect, test, type Page } from '@playwright/test';

// Remote photos are irrelevant to these checks; skipping them keeps runs fast and offline-safe.
test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com|google\.com\/maps/, (route) => route.abort());
});

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test('Arabic home page renders right-to-left without errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/ar/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('بعض الرحلات');
  await expect(page).toHaveTitle(/أريحا/);
  for (const id of ['styles', 'packages', 'destinations', 'services', 'custom', 'offer', 'why', 'contact']) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  expect(errors).toEqual([]);
});

test('English home page renders left-to-right', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Some journeys');
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute('href', /\/ar\/$/);
});

test('language switch keeps the visitor on the same package', async ({ page, isMobile }) => {
  await page.goto('/ar/packages/enchanting-istanbul/');
  if (isMobile) await page.getByRole('button', { name: 'القائمة' }).click();
  await page
    .getByRole('link', { name: /Switch to English/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/packages\/enchanting-istanbul\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enchanting Istanbul');
});

test('package filters read the travel style from the URL', async ({ page }) => {
  await page.goto('/en/packages/?style=romance');
  await expect(page.getByText('3 packages')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Maldives Escape' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Modern Dubai' })).toHaveCount(0);
  await page
    .getByRole('button', { name: /Clear filters|Reset/ })
    .first()
    .click();
  await expect(page.getByText('7 packages')).toBeVisible();
});

test('package page shows itinerary, enquiry links and structured data', async ({ page }) => {
  await page.goto('/ar/packages/istanbul-and-trabzon/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('إسطنبول وطرابزون');
  const day2 = page.getByRole('button', { name: /جولة إسطنبول/ });
  await expect(day2).toHaveAttribute('aria-expanded', 'false');
  await day2.click();
  await expect(day2).toHaveAttribute('aria-expanded', 'true');
  const wa = page.locator('#enquire a[href^="https://wa.me/"]');
  await expect(wa).toHaveAttribute('href', new RegExp(encodeURIComponent('إسطنبول وطرابزون')));
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((s) => s.includes('"TouristTrip"'))).toBe(true);
});

test('custom trip form validates and submits to Netlify Forms', async ({ page }) => {
  let body = '';
  await page.route('**/__forms.html', async (route) => {
    if (route.request().method() === 'POST') {
      body = route.request().postData() ?? '';
      return route.fulfill({ status: 200, body: 'ok' });
    }
    return route.continue();
  });
  await page.goto('/en/');
  const form = page.locator('form[name="custom-trip"]');
  await form.getByRole('button', { name: /Send trip request/ }).click();
  await expect(form.getByRole('alert').first()).toContainText('required');

  await form.getByLabel('Where are you thinking of going?').fill('Georgia');
  await form.getByLabel('Name').fill('Test Traveller');
  await form.getByLabel('Phone number').fill('0770 123 4567');
  await form.getByRole('button', { name: /Send trip request/ }).click();
  await expect(page.getByRole('heading', { name: /we’ve received your request/ })).toBeVisible();
  expect(body).toContain('form-name=custom-trip');
  expect(body).toContain('destination=Georgia');
});

test('phone validation rejects malformed numbers', async ({ page }) => {
  await page.goto('/ar/contact/');
  const form = page.locator('form[name="contact"]');
  await form.getByLabel('الاسم').fill('اختبار');
  await form.getByLabel('رقم الهاتف').fill('12345');
  await form.getByLabel('رسالتك').fill('مرحباً');
  await form.getByRole('button', { name: /أرسل الرسالة/ }).click();
  await expect(form.getByRole('alert').first()).toContainText('رقم هاتف صحيح');
});

test('unknown pages return the bilingual 404 page', async ({ page }) => {
  const res = await page.goto('/ar/does-not-exist/');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('هذه الصفحة غير موجودة')).toBeVisible();
});

test('sitemap lists every page in both languages', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('/ar/packages/maldives-escape/');
  expect(xml).toContain('/en/destinations/georgia/');
  expect(xml).toContain('hreflang="en"');
});
