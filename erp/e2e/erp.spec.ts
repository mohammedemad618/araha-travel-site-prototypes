import { expect, test, type Page } from '@playwright/test';

// One story, in order: the platform is set up, two travel companies join, the
// first one sells a trip end to end, and the second one must never see it.

test.describe.configure({ mode: 'serial' });

const ADMIN = { email: 'admin@niura.test', password: 'Platform-Pass-2026' };
const OWNER_A = { email: 'owner@alpha.test', password: '' };
const OWNER_B = { email: 'owner@beta.test', password: '' };
const SALES = { email: 'sales@alpha.test', password: '' };
const NEW_PASS = 'Owner-Strong-Pass-1';
const state: { apiKey?: string; leadId?: string; bookingUrl?: string; customerId?: string } = {};

/** Label match that ignores the required "*" marker. */
const label = (page: Page, text: string) => page.getByLabel(new RegExp(`^${text}\\s*\\*?$`));

async function login(page: Page, email: string, password: string, expectSuccess = true) {
  await page.goto('/login');
  await label(page, 'البريد الإلكتروني').fill(email);
  await label(page, 'كلمة المرور').fill(password);
  await page.getByRole('button', { name: 'دخول' }).click();
  if (expectSuccess) await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function readTempPassword(page: Page, email: string): Promise<string> {
  const box = page.getByRole('status').filter({ hasText: email });
  await expect(box.locator('code')).toBeVisible();
  return (await box.locator('code').textContent())!.trim();
}

test('first visit runs the one-time platform setup', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup$/);
  await label(page, 'الاسم').fill('Niura Admin');
  await label(page, 'البريد الإلكتروني').fill(ADMIN.email);
  await label(page, 'كلمة المرور الجديدة').fill(ADMIN.password);
  await label(page, 'تأكيد كلمة المرور').fill(ADMIN.password);
  await page.getByRole('button', { name: 'إنشاء' }).click();
  await expect(page).toHaveURL(/\/platform$/);

  // The setup page refuses to run a second time.
  await page.goto('/setup');
  await expect(page).not.toHaveURL(/\/setup$/);
});

test('platform admin adds two companies with owner accounts', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/platform$/);
  for (const [name, slug, owner] of [
    ['شركة ألفا للسياحة', 'alpha', OWNER_A],
    ['شركة بيتا للسفر', 'beta', OWNER_B],
  ] as const) {
    await label(page, 'اسم الشركة').fill(name);
    await label(page, 'المعرّف').fill(slug);
    await label(page, 'اسم المالك').fill(`مالك ${slug}`);
    await label(page, 'بريد المالك').fill(owner.email);
    await page.getByRole('button', { name: 'شركة جديدة' }).click();
    owner.password = await readTempPassword(page, owner.email);
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  }
  // Duplicate identifiers are rejected.
  await label(page, 'اسم الشركة').fill('مكرر');
  await label(page, 'المعرّف').fill('alpha');
  await label(page, 'اسم المالك').fill('x');
  await label(page, 'بريد المالك').fill('dup@x.test');
  await page.getByRole('button', { name: 'شركة جديدة' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('مستخدم مسبقاً');
});

test('a new owner must replace the temporary password', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await expect(page).toHaveURL(/\/account\/password$/);
  await label(page, 'كلمة المرور الحالية').fill(OWNER_A.password);
  await label(page, 'كلمة المرور الجديدة').fill(NEW_PASS);
  await label(page, 'تأكيد كلمة المرور').fill(NEW_PASS);
  await page.getByRole('button', { name: 'تغيير كلمة المرور' }).click();
  await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();
  OWNER_A.password = NEW_PASS;
});

test('wrong passwords are refused', async ({ page }) => {
  await login(page, OWNER_A.email, 'not-the-password', false);
  await expect(page.locator('p[role="alert"]')).toContainText('غير صحيحة');
});

test('owner sets up the company: staff, website key, package and dates', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.goto('/settings/users');
  await label(page, 'الاسم').fill('موظف المبيعات');
  await label(page, 'البريد الإلكتروني').fill(SALES.email);
  await label(page, 'الصلاحية').selectOption('sales');
  await page.getByRole('button', { name: 'مستخدم جديد' }).click();
  SALES.password = await readTempPassword(page, SALES.email);

  await page.goto('/settings/website');
  state.apiKey = (await page.locator('code').filter({ hasText: /^pk_/ }).textContent())!.trim();
  expect(state.apiKey).toMatch(/^pk_/);
  await label(page, 'رابط الموقع').fill('https://alpha-travel.example');
  await page.getByRole('button', { name: 'حفظ التغييرات' }).click();
  await expect(page.locator('p[role="status"]')).toContainText('تم الحفظ');

  await page.goto('/inventory');
  await page.locator('summary', { hasText: 'باقة جديدة' }).click();
  await label(page, 'اسم الباقة').fill('إسطنبول الساحرة');
  await label(page, 'المعرّف \\(نفس معرّف الباقة في الموقع\\)').fill('enchanting-istanbul');
  await label(page, 'الوجهة').fill('تركيا');
  await label(page, 'السعر للبالغ').fill('875,000');
  await label(page, 'سعر الطفل').fill('650000');
  await page.getByRole('button', { name: 'باقة جديدة' }).click();
  await expect(page).toHaveURL(/\/inventory\/[a-f0-9]{24}$/);
  const dep = page.locator('form').filter({ has: page.getByRole('button', { name: 'إضافة موعد' }) });
  await dep.getByLabel(/^التاريخ/).fill('2030-07-15');
  await dep.getByLabel(/^المقاعد/).fill('3');
  await dep.getByRole('button', { name: 'إضافة موعد' }).click();
  await expect(page.getByRole('cell', { name: /15 تموز 2030/ })).toBeVisible();
});

test('the public API accepts website leads and rejects bad requests', async ({ request }) => {
  const url = '/api/public/v1/leads';
  const lead = {
    'form-name': 'package-booking',
    page: '/ar/packages/enchanting-istanbul/',
    package: 'إسطنبول الساحرة',
    departure: '15 تموز 2030',
    travellers: 'بالغان',
    name: 'زبون من الموقع',
    phone: '0770 123 4567',
  };
  expect(
    (await request.post(url, { data: lead, headers: { 'x-api-key': 'pk_wrong-key-000000' } })).status(),
  ).toBe(401);
  expect(
    (
      await request.post(url, {
        data: lead,
        headers: { 'x-api-key': state.apiKey!, origin: 'https://evil.example' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post(url, { data: { ...lead, phone: '123' }, headers: { 'x-api-key': state.apiKey! } })
    ).status(),
  ).toBe(422);

  const bot = await request.post(url, {
    data: { ...lead, name: 'Bot', 'bot-field': 'x' },
    headers: { 'x-api-key': state.apiKey! },
  });
  expect(bot.status()).toBe(201);

  const ok = await request.post(url, {
    data: lead,
    headers: { 'x-api-key': state.apiKey!, origin: 'https://alpha-travel.example' },
  });
  expect(ok.status()).toBe(201);
  expect(ok.headers()['access-control-allow-origin']).toBe('https://alpha-travel.example');
  state.leadId = (await ok.json()).id;

  // A repeat from the same number joins the open lead instead of duplicating it.
  const again = await request.post(url, {
    data: { ...lead, 'form-name': 'callback', time: 'مساءً' },
    headers: { 'x-api-key': state.apiKey! },
  });
  expect((await again.json()).id).toBe(state.leadId);
});

test('the website lead appears on the board and converts to a booking', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.goto('/leads');
  await expect(page.getByRole('link', { name: 'زبون من الموقع' })).toBeVisible();
  await expect(page.getByText('Bot')).toHaveCount(0);

  await page.goto(`/leads/${state.leadId}`);
  await expect(page.getByText('+9647701234567')).toBeVisible();
  await expect(page.getByText('مساءً')).toBeVisible();
  await page.getByRole('button', { name: 'تحويل إلى عميل وحجز' }).click();
  await expect(page).toHaveURL(/\/bookings\/[a-f0-9]{24}/);
  state.bookingUrl = page.url().split('?')[0];
  await expect(page.getByRole('heading', { name: /BK-\d{4}-0001/ })).toBeVisible();
});

test('a package booking prices itself and respects seats', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.goto(state.bookingUrl!);
  await page.locator('summary', { hasText: 'تعديل' }).first().click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'حفظ التغييرات' }) });
  await form.getByLabel(/^نوع الحجز/).selectOption('package');
  await form.getByLabel(/^الباقة/).selectOption({ label: 'إسطنبول الساحرة' });
  await form.getByLabel(/^الموعد/).selectOption({ index: 1 });
  await form.getByLabel(/^البالغون/).fill('5');
  await form.getByRole('button', { name: 'حفظ التغييرات' }).click();
  await expect(form.locator('p[role="alert"]')).toContainText('لا توجد مقاعد كافية');

  // The error must not wipe what was entered: only the adult count changes.
  await expect(form.getByLabel(/^الموعد/)).not.toHaveValue('');
  await form.getByLabel(/^البالغون/).fill('2');
  await form.getByRole('button', { name: 'حفظ التغييرات' }).click();
  await expect(form.locator('p[role="status"]')).toContainText('تم الحفظ');
  await page.reload();
  await expect(page.getByText('15 تموز 2030').first()).toBeVisible();

  // Sale lines: 2 adults at 875,000.
  const item = page.locator('form').filter({ has: page.getByRole('button', { name: 'إضافة بند' }) });
  await item.getByLabel(/^الوصف/).fill('إسطنبول — البالغون');
  await item.getByLabel(/^الكمية/).fill('2');
  await item.getByLabel(/^سعر الوحدة/).fill('875000');
  await item.getByRole('button', { name: 'إضافة بند' }).click();
  await expect(page.getByText('1,750,000 د.ع').first()).toBeVisible();
});

test('payments in dollars convert and update the balance; voiding restores it', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.goto(state.bookingUrl!);
  const pay = page.locator('form').filter({ has: page.getByRole('button', { name: 'تسجيل دفعة' }) });
  await pay.getByLabel(/^المبلغ/).fill('500');
  await pay.getByLabel(/^العملة/).selectOption('USD');
  await pay.getByRole('button', { name: 'تسجيل دفعة' }).click();
  // 500 USD × 1,310 = 655,000 IQD paid; 1,750,000 − 655,000 = 1,095,000 left.
  await expect(page.getByText('1,095,000 د.ع').first()).toBeVisible();
  await expect(page.getByText('مؤكد').first()).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'إلغاء الإيصال' }).click();
  await expect(page.getByText('ملغى').first()).toBeVisible();
  await expect(page.getByText('1,750,000 د.ع').nth(2)).toBeVisible();
});

test('the catalog reports remaining seats to the website', async ({ request }) => {
  const res = await request.get(`/api/public/v1/catalog?key=${state.apiKey}`);
  expect(res.ok()).toBe(true);
  const data = await res.json();
  const pkg = data.packages.find((p: { slug: string }) => p.slug === 'enchanting-istanbul');
  expect(pkg.price).toBe(875000);
  expect(pkg.departures[0]).toMatchObject({ date: '2030-07-15', seatsLeft: 1, status: 'limited' });
});

test('invoice and CSV export are available', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  const id = state.bookingUrl!.split('/').pop();
  await page.goto(`/print/booking/${id}`);
  await expect(page.getByText('فاتورة حجز')).toBeVisible();
  const csv = await page.request.get('/api/export/bookings');
  expect(csv.headers()['content-type']).toContain('text/csv');
  const text = await csv.text();
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain('BK-');
});

test('another company cannot see or reach the first company’s data', async ({ page }) => {
  await login(page, OWNER_B.email, OWNER_B.password);
  await label(page, 'كلمة المرور الحالية').fill(OWNER_B.password);
  await label(page, 'كلمة المرور الجديدة').fill(NEW_PASS);
  await label(page, 'تأكيد كلمة المرور').fill(NEW_PASS);
  await page.getByRole('button', { name: 'تغيير كلمة المرور' }).click();
  await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();

  await page.goto('/leads');
  await expect(page.getByText('زبون من الموقع')).toHaveCount(0);
  await page.goto(state.bookingUrl!);
  await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  await page.goto(`/leads/${state.leadId}`);
  await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  const lookup = await page.request.get('/api/lookup/customers?q=زبون');
  expect(await lookup.json()).toEqual([]);
  const csv = await page.request.get('/api/export/bookings');
  expect(await csv.text()).not.toContain('BK-');
});

test('roles limit what staff can open', async ({ page }) => {
  await login(page, SALES.email, SALES.password);
  await label(page, 'كلمة المرور الحالية').fill(SALES.password);
  await label(page, 'كلمة المرور الجديدة').fill(NEW_PASS);
  await label(page, 'تأكيد كلمة المرور').fill(NEW_PASS);
  await page.getByRole('button', { name: 'تغيير كلمة المرور' }).click();
  await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'القائمة' }).first();
  await expect(nav.getByRole('link', { name: 'الطلبات' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'التقارير' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'الإعدادات' })).toHaveCount(0);
  for (const path of ['/reports', '/settings/users', '/suppliers']) {
    await page.goto(path);
    await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  }
  for (const list of ['payments', 'customers', 'bookings'])
    expect((await page.request.get(`/api/export/${list}`)).status()).toBe(404);
});

test('the interface switches to English', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
  await page.getByRole('button', { name: 'العربية' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
