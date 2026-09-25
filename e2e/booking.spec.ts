import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/images\.unsplash\.com/, (route) => route.abort());
});

test('chosen departure and travellers flow into WhatsApp and the booking form', async ({ page }) => {
  await page.goto('/en/packages/istanbul-and-trabzon/');
  const card = page.locator('#enquire');
  const radios = card.getByRole('radio');
  await expect(radios.first()).toHaveAttribute('aria-checked', 'true');

  // Keyboard: arrow keys move the selection (roving tabindex).
  await radios.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(radios.nth(1)).toBeFocused();
  const picked = (await radios.nth(1).locator('span').first().textContent())!.trim();

  await card.getByRole('button', { name: 'Increase Children' }).click();
  await expect(card.getByRole('link', { name: /Chat on WhatsApp/ })).toHaveAttribute(
    'href',
    new RegExp(encodeURIComponent(picked).replace(/%20/g, '(%20|\\+)')),
  );
  const href = await card.getByRole('link', { name: /Chat on WhatsApp/ }).getAttribute('href');
  expect(decodeURIComponent(href!)).toContain('2 adults, 1 child');

  await card.getByRole('button', { name: /Send a booking request/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Booking request' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel('Departure date')).toHaveValue(picked);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('booking request submits the selected date', async ({ page }) => {
  let body = '';
  await page.route('**/__forms.html', async (route) => {
    body = route.request().postData() ?? '';
    await route.fulfill({ status: 200, body: 'ok' });
  });
  await page.goto('/ar/packages/enchanting-istanbul/');
  const card = page.locator('#enquire');
  await card.getByRole('radio').nth(2).click();
  const picked = (await card.getByRole('radio').nth(2).locator('span').first().textContent())!.trim();
  await card.getByRole('button', { name: /أرسل طلب حجز/ }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByLabel('الاسم').fill('اختبار');
  await drawer.getByLabel('رقم الهاتف').fill('07701234567');
  await drawer.getByRole('button', { name: /أرسل طلب الحجز/ }).click();
  await expect(drawer.getByRole('heading', { name: /شكراً لك/ })).toBeFocused();
  const params = new URLSearchParams(body);
  expect(params.get('form-name')).toBe('package-booking');
  expect(params.get('departure')).toBe(picked);
  expect(params.get('travellers')).toBe('بالغان');
});

test('gallery opens a keyboard-friendly lightbox', async ({ page }) => {
  await page.goto('/en/packages/istanbul-and-trabzon/');
  await page
    .getByRole('button', { name: /View photos/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Around the destination' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('1 of 6')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByText('2 of 6')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
