import { expect, test, type Locator, type Page } from '@playwright/test';

// One story, in order: the platform is set up, two travel companies join, the
// first one sells a trip end to end, and the second one must never see it.

test.describe.configure({ mode: 'serial' });

const ADMIN = { email: 'admin@niura.test', password: 'Platform-Pass-2026' };
const OWNER_A = { email: 'owner@alpha.test', password: '' };
const OWNER_B = { email: 'owner@beta.test', password: '' };
const SALES = { email: 'sales@alpha.test', password: '' };
const BRANCH_SALES = { email: 'baghdad@alpha.test', password: '' };
const NEW_PASS = 'Owner-Strong-Pass-1';
/** Matches ADMIN_RESET_TOKEN in scripts/test-server.mjs. */
const RESET_TOKEN = 'e2e-recovery-token-0123456789abcdef';
const state: { apiKey?: string; leadId?: string; bookingUrl?: string; customerId?: string } = {};

/** Label match that ignores the required "*" marker. */
const label = (page: Page | Locator, text: string) => page.getByLabel(new RegExp(`^${text}\\s*\\*?$`));

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

test('the health check reports a connected database before setup', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ok', database: 'connected', setupDone: false });
  expect(typeof (await res.json()).latencyMs).toBe('number');
});

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

test('the platform admin is recovered with the server recovery token', async ({ page }) => {
  await page.goto('/reset-admin');
  await label(page, 'رمز الاستعادة').fill('not-the-token');
  await label(page, 'البريد الإلكتروني').fill('root@niura.test');
  await label(page, 'كلمة المرور الجديدة').fill('Recovered-Pass-2026');
  await label(page, 'تأكيد كلمة المرور').fill('Recovered-Pass-2026');
  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('رمز الاستعادة غير صحيح');

  await label(page, 'رمز الاستعادة').fill(RESET_TOKEN);
  await page.getByRole('button', { name: 'حفظ' }).click();
  await page.waitForURL('**/platform');

  await page.context().clearCookies();
  await login(page, ADMIN.email, ADMIN.password, false);
  await expect(page.locator('p[role="alert"]')).toContainText('غير صحيحة');
  ADMIN.email = 'root@niura.test';
  ADMIN.password = 'Recovered-Pass-2026';
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/platform/);
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

  // The package as a trip service: 2 adults at 875,000.
  const item = page.locator('form').filter({ has: page.getByRole('button', { name: 'إضافة خدمة' }) });
  await item.getByLabel(/^نوع الخدمة/).selectOption('package');
  await item.getByLabel(/^الوصف/).fill('إسطنبول — البالغون');
  await item.getByLabel(/^الكمية/).fill('2');
  await item.getByLabel(/^سعر الوحدة/).fill('875000');
  await item.getByRole('button', { name: 'إضافة خدمة' }).click();
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

/** Fills a bilingual field (its two inputs are named "<label> — العربية" / "<label> — English"). */
async function fillLoc(scope: Page | Locator, name: string, ar: string, en: string, nth = 0) {
  await scope.getByLabel(`${name} — العربية`, { exact: true }).nth(nth).fill(ar);
  await scope.getByLabel(`${name} — English`, { exact: true }).nth(nth).fill(en);
}

// A 1×1 PNG, enough for the image checks.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('website content: destination, visa and trip program are edited and served to the website build', async ({
  page,
  request,
}) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.goto('/website');
  await expect(page.getByRole('heading', { name: 'محتوى الموقع' })).toBeVisible();

  // A destination, with an Unsplash photo.
  await page.goto('/website/destination/new');
  await label(page, 'المعرّف في الرابط').fill('turkey');
  await fillLoc(page, 'اسم الوجهة', 'تركيا', 'Turkey');
  await label(page, 'التسمية على الخريطة').fill('إسطنبول');
  await label(page, 'الإحداثيات').fill('41.0° N · 28.9° E');
  await fillLoc(page, 'شعار قصير', 'بين قارتين', 'Between two continents');
  await fillLoc(page, 'الوصف', 'وصف تركيا', 'About Turkey');
  await fillLoc(page, 'أفضل موسم', 'الربيع', 'Spring');
  await label(page, 'مصدر الصورة').fill('https://images.unsplash.com/photo-1524231757912-21f4fe3a7200');
  await fillLoc(page, 'وصف الصورة (لقارئات الشاشة ومحركات البحث)', 'إسطنبول', 'Istanbul');
  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page).toHaveURL(/\/website\/destination\/turkey$/);

  // A visa page: a missing field is pointed out, then saved.
  await page.goto('/website/visa/new');
  await label(page, 'معرّف الوجهة').fill('turkey');
  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('راجع الحقول');
  await fillLoc(page, 'الملخص', 'تأشيرة إلكترونية', 'E-visa');
  await fillLoc(page, 'طريقة التقديم', 'عبر الإنترنت', 'Online');
  await fillLoc(page, 'بند', 'جواز سفر', 'Passport');
  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page).toHaveURL(/\/website\/visa\/turkey$/);

  // The trip program of the package created earlier, with a library image.
  await page.goto('/website?tab=package');
  await page.getByRole('link', { name: 'إسطنبول الساحرة' }).click();
  await expect(page).toHaveURL(/\/website\/package\/enchanting-istanbul$/);
  await fillLoc(page, 'اسم الباقة', 'إسطنبول الساحرة', 'Enchanting Istanbul');
  // The live preview follows the form, with the price from inventory, in either language.
  const preview = page.getByTestId('site-preview');
  await expect(preview.getByRole('heading', { level: 1 })).toHaveText('إسطنبول الساحرة');
  await expect(preview).toContainText('875,000');
  const previewLang = page.getByRole('group', { name: 'لغة المعاينة' });
  await previewLang.getByRole('button', { name: 'English' }).click();
  await expect(preview.getByRole('heading', { level: 1 })).toHaveText('Enchanting Istanbul');
  await expect(preview).toHaveAttribute('dir', 'ltr');
  await previewLang.getByRole('button', { name: 'العربية' }).click();
  await label(page, 'الوجهة').selectOption('turkey');
  await page.getByLabel('عائلية').check();
  await fillLoc(page, 'أساس السعر (مثل: للشخص في غرفة مزدوجة)', 'للشخص', 'per person');
  await fillLoc(page, 'جملة تعريفية قصيرة', 'مدينة على قارتين', 'A city on two continents');
  await fillLoc(page, 'نبذة عن الرحلة', 'سبع ليالٍ', 'Seven nights');
  await fillLoc(page, 'ميزة', 'فنادق 5 نجوم', '5-star hotels');
  for (const [name, ar, en] of [
    ['المسار', 'إسطنبول', 'Istanbul'],
    ['الإقامة', 'فنادق', 'Hotels'],
    ['الطيران', 'من بغداد', 'From Baghdad'],
    ['الموسم', 'طوال السنة', 'All year'],
    ['حجم المجموعة', '16', '16'],
  ] as const)
    await fillLoc(page, name, ar, en);
  await fillLoc(page, 'عنوان اليوم', 'الوصول', 'Arrival');
  await fillLoc(page, 'تفاصيل اليوم', 'استقبال في المطار', 'Airport pick-up');
  await page.getByRole('button', { name: 'إضافة اليوم' }).click();
  await fillLoc(page, 'عنوان اليوم', 'جولة البسفور', 'Bosphorus cruise', 1);
  await fillLoc(page, 'تفاصيل اليوم', 'رحلة بحرية', 'A boat trip', 1);
  await expect(preview.getByRole('listitem').filter({ hasText: 'جولة البسفور' })).toBeVisible();
  await fillLoc(page, 'بند', 'الإقامة', 'Hotel stay');

  await page.getByRole('button', { name: 'اختر من المكتبة أو ارفع' }).click();
  const dialog = page.getByRole('dialog', { name: 'مكتبة الصور' });
  await dialog
    .getByLabel('رفع صورة')
    .setInputFiles({ name: 'istanbul.png', mimeType: 'image/png', buffer: PNG });
  await expect(dialog).toBeHidden();
  await expect(label(page, 'مصدر الصورة')).toHaveValue(/^media:[a-f0-9]{24}$/);
  await fillLoc(page, 'وصف الصورة (لقارئات الشاشة ومحركات البحث)', 'مسجد', 'A mosque');
  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page.locator('p[role="status"]')).toContainText('تم الحفظ');

  // The website's build receives pages shaped like its own content files.
  const res = await request.get(`/api/public/v1/content?key=${state.apiKey}`);
  expect(res.ok()).toBe(true);
  const data = await res.json();
  const pkg = data.packages.find((p: { slug: string }) => p.slug === 'enchanting-istanbul');
  expect(pkg).toMatchObject({
    destination: 'turkey',
    price: 875000,
    styles: ['family'],
    departures: [{ date: '2030-07-15', status: 'limited' }],
  });
  expect(pkg.itinerary.map((d: { title: { en: string } }) => d.title.en)).toEqual([
    'Arrival',
    'Bosphorus cruise',
  ]);
  expect(pkg.image.src).toMatch(/\/api\/public\/media\/[a-f0-9]{24}$/);
  // Blank optional text is left out rather than sent empty.
  expect(JSON.stringify(pkg)).not.toContain('""');
  expect(data.visas[0]).toMatchObject({ destination: 'turkey', status: 'e-visa' });
  expect(data.destinations[0]).toMatchObject({ slug: 'turkey', homeLayout: 'mid' });

  // The image is public, with a long cache.
  const img = await request.get(new URL(pkg.image.src).pathname);
  expect(img.headers()['content-type']).toBe('image/png');
  expect(img.headers()['cache-control']).toContain('immutable');

  // A guide is written, served, then deleted.
  await page.goto('/website?tab=guide');
  await page.getByRole('link', { name: 'دليل جديد' }).click();
  await label(page, 'المعرّف في الرابط').fill('istanbul-tips');
  await fillLoc(page, 'عنوان الدليل', 'نصائح إسطنبول', 'Istanbul tips');
  await fillLoc(page, 'مقتطف قصير', 'قبل أن تسافر', 'Before you go');
  await label(page, 'مصدر الصورة').fill('https://images.unsplash.com/photo-1524231757912-21f4fe3a7200');
  await fillLoc(page, 'وصف الصورة (لقارئات الشاشة ومحركات البحث)', 'إسطنبول', 'Istanbul');
  await fillLoc(page, 'العنوان', 'المواصلات', 'Getting around');
  await fillLoc(page, 'النص', 'استخدم بطاقة المترو', 'Use a metro card');
  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page).toHaveURL(/\/website\/guide\/istanbul-tips$/);

  // The FAQ exists once per website and can be filled in before any import.
  await page.goto('/website?tab=settings');
  await page.getByRole('link', { name: 'الأسئلة الشائعة' }).click();
  await expect(page).toHaveURL(/\/website\/faq\/main$/);
  await page.getByRole('button', { name: 'إضافة السؤال' }).click();
  await fillLoc(page, 'السؤال', 'هل الأسعار شاملة؟', 'Are prices inclusive?');
  await fillLoc(page, 'الجواب', 'نعم', 'Yes');
  await page.getByRole('button', { name: 'حفظ ونشر' }).click();
  await expect(page.locator('p[role="status"]')).toContainText('تم الحفظ');

  const more = await (await request.get(`/api/public/v1/content?key=${state.apiKey}`)).json();
  expect(more.guides).toMatchObject([
    { slug: 'istanbul-tips', category: 'tips', sections: [{ heading: { en: 'Getting around' } }] },
  ]);
  expect(more.faq).toEqual({
    items: [
      {
        question: { ar: 'هل الأسعار شاملة؟', en: 'Are prices inclusive?' },
        answer: { ar: 'نعم', en: 'Yes' },
      },
    ],
  });
  expect(more.site).toBeNull();

  await page.goto('/website/guide/istanbul-tips');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'حذف الدليل' }).click();
  await expect(page).toHaveURL(/\/website\?tab=guide$/);
  expect((await (await request.get(`/api/public/v1/content?key=${state.apiKey}`)).json()).guides).toEqual([]);

  // Only the website's own fixed pages exist.
  expect((await page.goto('/website/page/careers'))?.status()).toBe(404);

  // Without a key nothing is served.
  expect((await request.get('/api/public/v1/content?key=pk_wrongwrongwrong')).status()).toBe(401);
});

test('a quote is priced, sent, accepted into a booking, then invoiced', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  const id = state.bookingUrl!.split('/').pop();
  await page.goto(`/print/booking/${id}`);
  await expect(page.getByText('كشف حساب الحجز')).toBeVisible();

  // A quote for the website lead (its customer already exists).
  await page.goto(`/quotes/new?lead=${state.leadId}`);
  await label(page.locator('main'), 'عنوان الحجز').fill('طرابزون — عرض العائلة');
  await page.getByRole('button', { name: 'عرض سعر جديد' }).click();
  await expect(page).toHaveURL(/\/quotes\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name: /QT-\d{4}-0001/ })).toBeVisible();
  const line = page.locator('form').filter({ has: page.getByRole('button', { name: 'إضافة خدمة' }) });
  await line.getByLabel(/^نوع الخدمة/).selectOption('flight');
  await line.getByLabel(/^الوصف/).fill('تذاكر طيران أربيل — طرابزون');
  await line.getByLabel(/^الكمية/).fill('2');
  await line.getByLabel(/^سعر الوحدة/).fill('450000');
  await line.getByRole('button', { name: 'إضافة خدمة' }).click();
  await expect(page.getByText('900,000 د.ع').first()).toBeVisible();
  await page.getByRole('button', { name: 'تم الإرسال للعميل' }).click();
  await expect(page.getByText('مُرسل').first()).toBeVisible();
  const quoteUrl = page.url();
  await page.goto(`/print/quote/${quoteUrl.split('/').pop()}`);
  await expect(page.getByText('عرض سعر', { exact: true })).toBeVisible();
  await expect(page.getByText(/هذا العرض صالح حتى/)).toBeVisible();

  // Accepting creates the booking with the same services, waiting for the supplier.
  await page.goto(quoteUrl);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'قبول وتحويل إلى حجز' }).click();
  await expect(page).toHaveURL(/\/bookings\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name: /BK-\d{4}-0002/ })).toBeVisible();
  await expect(page.getByText('0 من 1 مؤكدة')).toBeVisible();
  await page.getByLabel(/^الحالة — تذاكر طيران/).selectOption('confirmed');
  await expect(page.getByText('1 من 1 مؤكدة')).toBeVisible();

  // A numbered invoice, printable, and voidable with its number kept.
  await page.getByRole('button', { name: 'إصدار فاتورة' }).click();
  const invoice = page.getByRole('link', { name: /INV-\d{4}-0001/ });
  await expect(invoice).toBeVisible();
  const invoiceHref = await invoice.getAttribute('href');
  await page.goto(invoiceHref!);
  await expect(page.getByText('فاتورة', { exact: true })).toBeVisible();
  await expect(page.getByText('900,000 د.ع').first()).toBeVisible();
  await page.goBack();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'إلغاء الفاتورة' }).click();
  const invoices = page.locator('section', { has: page.getByRole('heading', { name: 'الفواتير' }) });
  await expect(invoices.getByText('ملغاة')).toBeVisible();
  await expect(page.getByRole('button', { name: 'إصدار فاتورة' })).toBeVisible();
  await page.goto('/invoices');
  await expect(page.getByRole('link', { name: /INV-\d{4}-0001/ })).toBeVisible();

  // The ledger: balanced, and receivables equal what confirmed bookings still owe
  // (booking 1 at 1,750,000 after its payment was voided; booking 2 is a draft).
  await page.goto('/accounting');
  await expect(page.getByText('1,750,000 د.ع').first()).toBeVisible();
  await page.goto('/accounting/reports?report=trial');
  await expect(page.getByText('الميزان متوازن')).toBeVisible();

  // An expense paid from cash reaches the income statement.
  await page.goto('/accounting/expenses');
  await label(page, 'بند المصروف').selectOption({ label: '6200 — الإيجار' });
  await label(page, 'المبلغ').fill('250000');
  await label(page, 'المستفيد').fill('مالك المكتب');
  await page.getByRole('button', { name: 'تسجيل مصروف' }).click();
  await expect(page.getByRole('cell', { name: /EX-\d{4}-0001/ })).toBeVisible();
  await page.goto('/accounting/reports?report=pl');
  await expect(page.getByRole('link', { name: /الإيجار/ })).toBeVisible();

  // Manual entries must balance; a posted one can be reversed.
  await page.goto('/accounting/journal/new');
  await label(page, 'البيان').fill('رأس المال الافتتاحي');
  await page.getByLabel('الحساب 1').selectOption({ label: '1110 — البنك' });
  await page.getByLabel('مدين 1').fill('5000000');
  await page.getByLabel('الحساب 2').selectOption({ label: '3100 — رأس المال' });
  await page.getByLabel('دائن 2').fill('4000000');
  await page.getByRole('button', { name: 'ترحيل القيد' }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('غير متوازن');
  await page.getByLabel('دائن 2').fill('5000000');
  await page.getByRole('button', { name: 'ترحيل القيد' }).click();
  await expect(page).toHaveURL(/\/accounting\/journal\/[a-f0-9]{24}$/);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'عكس القيد' }).click();
  await expect(page.getByText('عكس قيد').first()).toBeVisible();

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
  for (const path of ['/reports', '/settings/users', '/suppliers', '/accounting', '/accounting/journal']) {
    await page.goto(path);
    await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  }
  for (const list of ['payments', 'customers', 'bookings'])
    expect((await page.request.get(`/api/export/${list}`)).status()).toBe(404);
});

test('branches: staff limited to one branch see only its records', async ({ page }) => {
  await login(page, OWNER_A.email, OWNER_A.password);
  await page.goto('/settings/branches');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'فرع جديد' }) });
  await label(form, 'اسم الفرع').fill('فرع بغداد');
  await label(form, 'رمز الفرع').fill('BGD');
  await form.getByRole('button', { name: 'فرع جديد' }).click();
  await expect(page.locator('main').getByText('فرع بغداد', { exact: true })).toBeVisible();

  // A lead recorded in the new branch.
  await page.goto('/leads/new');
  const main = page.locator('main');
  await label(main, 'الاسم').fill('زبون فرع بغداد');
  await label(main, 'الهاتف').fill('07801234567');
  await label(main, 'الفرع').selectOption({ label: 'فرع بغداد' });
  await page.getByRole('button', { name: 'طلب جديد' }).click();
  await expect(page).toHaveURL(/\/leads\/[a-f0-9]{24}$/);

  // A sales person who works only in that branch.
  await page.goto('/settings/users');
  await label(page, 'الاسم').fill('مبيعات بغداد');
  await label(page, 'البريد الإلكتروني').fill(BRANCH_SALES.email);
  await label(page, 'الصلاحية').selectOption('sales');
  await label(page, 'نطاق الرؤية').selectOption('branch');
  await page.getByRole('checkbox', { name: 'فرع بغداد' }).check();
  await page.getByRole('button', { name: 'مستخدم جديد' }).click();
  BRANCH_SALES.password = await readTempPassword(page, BRANCH_SALES.email);

  // The owner can narrow every list to one branch from the header.
  await page.goto('/leads?view=list');
  await expect(page.getByRole('link', { name: 'زبون من الموقع' })).toBeVisible();
  await page.locator('header').getByLabel('الفرع').selectOption({ label: 'فرع بغداد' });
  await expect(page.getByRole('link', { name: 'زبون من الموقع' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'زبون فرع بغداد' })).toBeVisible();
  await page.locator('header').getByLabel('الفرع').selectOption({ label: 'كل الفروع' });
  await expect(page.getByRole('link', { name: 'زبون من الموقع' })).toBeVisible();

  await page.context().clearCookies();
  await login(page, BRANCH_SALES.email, BRANCH_SALES.password);
  await label(page, 'كلمة المرور الحالية').fill(BRANCH_SALES.password);
  await label(page, 'كلمة المرور الجديدة').fill(NEW_PASS);
  await label(page, 'تأكيد كلمة المرور').fill(NEW_PASS);
  await page.getByRole('button', { name: 'تغيير كلمة المرور' }).click();
  await expect(page.getByRole('heading', { name: /مرحباً/ })).toBeVisible();
  await page.goto('/leads?view=list');
  await expect(page.getByRole('link', { name: 'زبون فرع بغداد' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'زبون من الموقع' })).toHaveCount(0);
  // Records of the main branch are out of reach, even by address.
  await page.goto(`/leads/${state.leadId}`);
  await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
  await page.goto(state.bookingUrl!);
  await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
});

test('one person can work in two companies and switch between them', async ({ page }) => {
  await login(page, OWNER_B.email, NEW_PASS);
  await page.goto('/settings/users');
  await label(page, 'الاسم').fill('موظف مشترك');
  await label(page, 'البريد الإلكتروني').fill(SALES.email);
  await label(page, 'الصلاحية').selectOption('manager');
  await page.getByRole('button', { name: 'مستخدم جديد' }).click();
  // The existing account keeps its own password: none is shown.
  await expect(page.getByRole('status').filter({ hasText: SALES.email })).toContainText('بنفس كلمة مروره');
  // Another company cannot reset that person's password.
  const row = page.getByRole('row').filter({ hasText: SALES.email });
  await row.getByRole('button', { name: 'إعادة تعيين كلمة المرور' }).click();
  await expect(row.locator('p[role="alert"]')).toContainText('شركة أخرى');

  await page.context().clearCookies();
  await login(page, SALES.email, NEW_PASS);
  const switcher = page.locator('header').getByLabel('تبديل الشركة');
  await expect(switcher).toBeVisible();
  await switcher.selectOption({ label: 'شركة بيتا للسفر' });
  // The sidebar shows the company being worked in once the switch has completed.
  const brand = page.locator('aside').first();
  await expect(brand.getByText('شركة بيتا للسفر')).toBeVisible();
  await page.goto('/leads?view=list');
  await expect(page.getByRole('link', { name: 'زبون من الموقع' })).toHaveCount(0);
  // As a manager here, reports are open; in the first company (sales) they are not.
  await page.goto('/reports');
  await expect(page.getByText('الصفحة غير موجودة')).toHaveCount(0);
  await page.locator('header').getByLabel('تبديل الشركة').selectOption({ label: 'شركة ألفا للسياحة' });
  await expect(brand.getByText('شركة ألفا للسياحة')).toBeVisible();
  await page.goto('/reports');
  await expect(page.getByText('الصفحة غير موجودة')).toBeVisible();
});

test('the interface switches to English', async ({ page }) => {
  // Another account: the owner has used up its sign-in attempts for this window.
  await login(page, BRANCH_SALES.email, NEW_PASS);
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
  await page.getByRole('button', { name: 'العربية' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
