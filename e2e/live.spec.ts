import { expect, test, type Page } from '@playwright/test';

// Live prices and seats from the Niura ERP. The test supplies the public key
// in the page and answers the ERP catalog itself, so it runs against the normal
// static build.

const SLUG = 'istanbul-and-trabzon';
const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

async function withCatalog(page: Page, reply: { status?: number; body?: unknown }) {
  const requests: string[] = [];
  await page.addInitScript(() => {
    (window as { __NIURA_ERP_KEY__?: string }).__NIURA_ERP_KEY__ = 'pk_live_test_key';
  });
  await page.route(/images\.unsplash\.com|google\.com\/maps/, (route) => route.abort());
  await page.route('**/erp-api/v1/catalog**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: reply.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(reply.body ?? {}),
    });
  });
  return requests;
}

const catalog = {
  packages: [
    {
      slug: SLUG,
      currency: 'IQD',
      price: 1095000,
      childPrice: 790000,
      departures: [
        { date: day(20), status: 'limited', seatsLeft: 3 },
        { date: day(34), status: 'soldout', seatsLeft: 0 },
        { date: day(48), status: 'available', seatsLeft: 18, price: 1150000 },
      ],
    },
  ],
};

test('package page shows the live price, dates and seats left', async ({ page }) => {
  const requests = await withCatalog(page, { body: catalog });
  await page.goto(`/en/packages/${SLUG}/`);
  const card = page.locator('#enquire');
  await expect(card.getByText('1,095,000').first()).toBeVisible();
  const radios = card.getByRole('radio');
  await expect(radios).toHaveCount(3);
  await expect(radios.nth(0)).toContainText('3 seats left');
  await expect(radios.nth(1)).toContainText('Sold out');
  await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
  expect(requests[0]).toContain('key=pk_live_test_key');

  // A date with its own price is used for the estimate: 2 adults × 1,150,000.
  await radios.nth(2).click();
  await expect(card.getByText('2,300,000')).toBeVisible();
});

test('package cards use the live price', async ({ page }) => {
  await withCatalog(page, { body: catalog });
  await page.goto('/en/packages/');
  const card = page
    .locator('article, li')
    .filter({ has: page.getByRole('link', { name: 'Istanbul & Trabzon' }) })
    .first();
  await expect(card.getByText('1,095,000')).toBeVisible();
});

test('without the ERP the built prices stay', async ({ page }) => {
  await withCatalog(page, { status: 502, body: { error: 'down' } });
  await page.goto(`/en/packages/${SLUG}/`);
  await expect(page.locator('#enquire').getByText('995,000').first()).toBeVisible();
});
