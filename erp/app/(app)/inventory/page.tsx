import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { formatDate, formatDateTime, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { seatsByDeparture } from '@/lib/bookings';
import { Badge, Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { ImportButton, PackageForm, PublishButton } from './InventoryForms';

export const metadata: Metadata = { title: 'Packages & dates' };

export default async function InventoryPage() {
  const ctx = await requireTenant('bookings.read');
  const { t, lang } = await getI18n();
  const r = await repo(ctx);
  const today = todayISO();
  const [packages, departures] = await Promise.all([
    r.packages.find({}).sort({ active: -1, title: 1 }).toArray(),
    r.departures
      .find({ date: { $gte: today } })
      .sort({ date: 1 })
      .toArray(),
  ]);
  const seats = await seatsByDeparture(
    ctx.tenantId,
    departures.map((d) => d._id),
  );
  const canWrite = can(ctx.role, 'inventory.write');
  const lastPub = ctx.tenant.website.lastPublishedAt;

  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        intro={t('inventory.intro')}
        actions={
          canWrite && (
            <div className="flex flex-col items-end gap-1">
              <PublishButton />
              <span className="text-[12px] text-muted">
                {lastPub
                  ? t('inventory.lastPublished', { date: formatDateTime(lastPub, lang) })
                  : t('inventory.publishHint')}
              </span>
            </div>
          )
        }
      />
      {canWrite && (
        <Card className="mb-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <p className="m-0 max-w-xl text-[13.5px] text-muted">{t('inventory.importHint')}</p>
            <ImportButton />
          </div>
          <details>
            <summary className="cursor-pointer font-semibold">{t('inventory.newPackage')}</summary>
            <div className="mt-5">
              <PackageForm defaultCurrency={ctx.tenant.settings.currency} />
            </div>
          </details>
        </Card>
      )}
      <Card padded={false}>
        {packages.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t('common.noResults')} body={t('inventory.noPackages')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('inventory.titleField')}</th>
                <th>{t('inventory.destination')}</th>
                <th>{t('inventory.price')}</th>
                <th>{t('inventory.departures')}</th>
                <th>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => {
                const deps = departures.filter((d) => String(d.packageId) === String(p._id));
                return (
                  <tr key={String(p._id)}>
                    <td>
                      <Link href={`/inventory/${p._id}`} className="font-medium hover:underline">
                        {p.title}
                      </Link>
                      <div className="font-latin text-[12px] text-faint" dir="ltr">
                        {p.slug} · {p.days}D/{p.nights}N
                      </div>
                    </td>
                    <td>{p.destination}</td>
                    <td className="num">{formatMoney(p.price, p.currency, lang)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {deps.slice(0, 4).map((d) => {
                          const left = d.capacity - (seats.get(String(d._id)) ?? 0);
                          return (
                            <Badge
                              key={String(d._id)}
                              tone={
                                d.closed
                                  ? 'neutral'
                                  : left <= 0
                                    ? 'danger'
                                    : left <= 5
                                      ? 'warning'
                                      : 'success'
                              }
                            >
                              {formatDate(d.date, lang)} ·{' '}
                              {d.closed ? t('inventory.closed') : left <= 0 ? t('inventory.full') : left}
                            </Badge>
                          );
                        })}
                        {deps.length === 0 && (
                          <span className="text-[13px] text-faint">{t('inventory.noDepartures')}</span>
                        )}
                        {deps.length > 4 && (
                          <span className="text-[12.5px] text-muted">+{deps.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge tone={p.active ? 'success' : 'neutral'}>
                        {p.active ? t('inventory.active') : t('inventory.inactive')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
