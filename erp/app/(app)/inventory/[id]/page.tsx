import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { can } from '@/lib/rbac';
import { formatDate, todayISO } from '@/lib/dates';
import { formatMoney, moneyInput } from '@/lib/money';
import { seatsByDeparture } from '@/lib/bookings';
import type { Departure, TravelPackage } from '@/lib/types';
import { Badge, Card, PageHeader, Table, buttonClass } from '@/components/ui';
import { DeleteDepartureButton, DeletePackageButton, DepartureForm, PackageForm } from '../InventoryForms';

export const metadata: Metadata = { title: 'Package' };

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('bookings.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const db = await getDb();
  const pkg = await db.collection<TravelPackage>('packages').findOne({ _id: id, tenantId: ctx.tenantId });
  if (!pkg) notFound();
  const departures = await db
    .collection<Departure>('departures')
    .find({ tenantId: ctx.tenantId, packageId: id })
    .sort({ date: 1 })
    .toArray();
  const seats = await seatsByDeparture(
    ctx.tenantId,
    departures.map((d) => d._id),
  );
  const canWrite = can(ctx.role, 'inventory.write');
  const today = todayISO();

  return (
    <>
      <PageHeader
        back={{ href: '/inventory', label: t('inventory.title') }}
        title={pkg.title}
        intro={`${pkg.destination} · ${pkg.days}/${pkg.nights} · ${formatMoney(pkg.price, pkg.currency, lang)}`}
        actions={canWrite && <DeletePackageButton id={String(id)} />}
      />
      <Card title={t('inventory.departures')} padded={false} className="mb-5">
        {departures.length === 0 ? (
          <p className="m-0 p-5 text-[13.5px] text-muted">{t('inventory.noDepartures')}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('common.date')}</th>
                <th>{t('inventory.capacity')}</th>
                <th>{t('inventory.booked')}</th>
                <th>{t('inventory.remaining')}</th>
                <th>{t('inventory.price')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.notes')}</th>
                <th>
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {departures.map((d) => {
                const booked = seats.get(String(d._id)) ?? 0;
                const left = d.capacity - booked;
                const past = d.date < today;
                return (
                  <tr key={String(d._id)} className={past ? 'opacity-55' : ''}>
                    <td className="font-medium">{formatDate(d.date, lang)}</td>
                    <td className="num">{d.capacity}</td>
                    <td className="num">
                      {booked > 0 ? (
                        <Link href={`/bookings?departure=${d._id}`} className="text-info hover:underline">
                          {booked}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="num">{left}</td>
                    <td className="num">{formatMoney(d.price ?? pkg.price, pkg.currency, lang)}</td>
                    <td>
                      <Badge
                        tone={d.closed ? 'neutral' : left <= 0 ? 'danger' : left <= 5 ? 'warning' : 'success'}
                      >
                        {d.closed
                          ? t('inventory.closed')
                          : left <= 0
                            ? t('inventory.full')
                            : t('inventory.open')}
                      </Badge>
                    </td>
                    <td className="text-muted">{d.notes ?? '—'}</td>
                    <td>
                      {canWrite && (
                        <div className="flex items-center justify-end gap-1">
                          <details className="relative">
                            <summary className={buttonClass('ghost', 'sm', 'list-none')}>
                              {t('common.edit')}
                            </summary>
                            <div className="absolute end-0 z-20 mt-2 w-[min(900px,90vw)] rounded-xl border border-line bg-surface p-4 shadow-xl">
                              <DepartureForm
                                packageId={String(id)}
                                values={{
                                  id: String(d._id),
                                  date: d.date,
                                  capacity: d.capacity,
                                  price: d.price !== undefined ? moneyInput(d.price, pkg.currency) : '',
                                  notes: d.notes,
                                  closed: d.closed,
                                }}
                              />
                            </div>
                          </details>
                          <DeleteDepartureButton id={String(d._id)} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {canWrite && (
          <div className="border-t border-line p-5">
            <DepartureForm packageId={String(id)} />
          </div>
        )}
      </Card>
      {canWrite && (
        <Card title={t('common.edit')}>
          <PackageForm
            defaultCurrency={ctx.tenant.settings.currency}
            values={{
              id: String(pkg._id),
              slug: pkg.slug,
              title: pkg.title,
              titleEn: pkg.titleEn,
              destination: pkg.destination,
              days: pkg.days,
              nights: pkg.nights,
              currency: pkg.currency,
              price: moneyInput(pkg.price, pkg.currency),
              childPrice: pkg.childPrice !== undefined ? moneyInput(pkg.childPrice, pkg.currency) : '',
              active: pkg.active,
            }}
          />
        </Card>
      )}
    </>
  );
}
