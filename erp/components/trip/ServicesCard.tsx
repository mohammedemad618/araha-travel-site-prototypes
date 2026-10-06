import Link from 'next/link';
import {
  BedDouble,
  Car,
  Circle,
  MapPin,
  Package,
  Plane,
  ShieldCheck,
  Stamp,
  type LucideIcon,
} from 'lucide-react';
import type { ActionResult } from '@/lib/forms';
import { getI18n } from '@/lib/i18n/server';
import { formatDate } from '@/lib/dates';
import { formatMoney, moneyInput } from '@/lib/money';
import { SERVICE_TONE } from '@/lib/ui-tones';
import { isActive, lineTotal, lineTotals, readiness } from '@/lib/services';
import type { Currency, ServiceLine, ServiceType } from '@/lib/types';
import { Badge, Card, Table } from '../ui';
import { EditableRow, EditableTable } from '../EditableRow';
import {
  DeleteLineButton,
  DiscountField,
  ServiceForm,
  ServiceStatusSelect,
  type PackagePrice,
} from './ServiceParts';

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

const ICONS: Record<ServiceType, LucideIcon> = {
  package: Package,
  flight: Plane,
  hotel: BedDouble,
  visa: Stamp,
  transfer: Car,
  tour: MapPin,
  insurance: ShieldCheck,
  other: Circle,
};

/**
 * The services of a booking (or the lines of a quote): what is sold, from which
 * supplier, at what cost, and how far each part is confirmed.
 */
export async function ServicesCard({
  lines,
  discount,
  currency,
  parent,
  suppliers,
  packages,
  canWrite,
  canCost,
  operational,
  actions,
  rateNote,
}: {
  lines: ServiceLine[];
  discount: number;
  currency: Currency;
  parent: { name: string; value: string };
  suppliers: { id: string; name: string }[];
  packages?: PackagePrice[];
  canWrite: boolean;
  /** Supplier and cost columns, for staff with finance access. */
  canCost: boolean;
  /** Status and confirmation tracking (bookings only). */
  operational: boolean;
  actions: { save: Action; remove: Action; status?: Action; discount: Action };
  rateNote?: string;
}) {
  const { t, lang } = await getI18n();
  const money = (v: number, c: Currency = currency) => formatMoney(v, c, lang);
  const { subtotal, total, costTotal } = lineTotals(lines, discount);
  const ready = readiness(lines);
  const supplierName = (id?: unknown) => suppliers.find((s) => s.id === String(id))?.name;
  const cols = 3 + (operational ? 1 : 0);
  const editors = Object.fromEntries(
    lines.map((l) => [
      String(l._id),
      <ServiceForm
        key={String(l._id)}
        action={actions.save}
        parent={parent}
        suppliers={suppliers}
        currency={currency}
        canCost={canCost}
        operational={operational}
        line={{
          id: String(l._id),
          type: l.type,
          description: l.description,
          details: l.details,
          startDate: l.startDate,
          endDate: l.endDate,
          qty: l.qty,
          unitPrice: moneyInput(l.unitPrice, currency),
          status: l.status,
          confirmation: l.confirmation,
          supplierId: l.supplierId ? String(l.supplierId) : undefined,
          cost: l.cost !== undefined ? moneyInput(l.cost, l.costCurrency ?? currency) : undefined,
          costCurrency: l.costCurrency,
        }}
      />,
    ]),
  );

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t('services.title')}
          {operational && ready.total > 0 && (
            <Badge tone={ready.confirmed === ready.total ? 'success' : 'warning'}>
              {t('services.readiness', { done: ready.confirmed, total: ready.total })}
            </Badge>
          )}
        </span>
      }
      padded={false}
    >
      {lines.length === 0 ? (
        <p className="m-0 p-5 text-[13.5px] text-muted">{t('services.none')}</p>
      ) : (
        <EditableTable editors={canWrite ? editors : {}}>
          <Table className="[&_td]:px-3 [&_th]:px-3">
            <thead>
              <tr>
                <th>{t('services.service')}</th>
                {operational && <th>{t('common.status')}</th>}
                <th>{t('bookings.lineTotal')}</th>
                <th>
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const Icon = ICONS[l.type] ?? Circle;
                const sup = supplierName(l.supplierId);
                const dates = [l.startDate, l.endDate]
                  .filter(Boolean)
                  .map((d) => formatDate(d, lang))
                  .join(lang === 'ar' ? ' ← ' : ' → ');
                return (
                  <EditableRow
                    key={String(l._id)}
                    id={String(l._id)}
                    className={isActive(l) ? '' : 'opacity-55'}
                    editable={canWrite}
                    label={`${t('common.edit')} — ${l.description}`}
                    actions={
                      canWrite && (!l.cost || canCost) ? (
                        <DeleteLineButton action={actions.remove} parent={parent} lineId={String(l._id)} />
                      ) : undefined
                    }
                  >
                    <td className="min-w-[140px]">
                      <div className="flex items-start gap-2.5">
                        <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                        <div className="min-w-0">
                          <div className={`font-medium ${isActive(l) ? '' : 'line-through'}`}>
                            {l.description}
                          </div>
                          <div className="text-[12.5px] text-muted">
                            {t(`services.types.${l.type}`)}
                            {dates && ` · ${dates}`}
                            {l.confirmation && (
                              <>
                                {' · '}
                                <span className="font-latin" dir="ltr">
                                  {l.confirmation}
                                </span>
                              </>
                            )}
                          </div>
                          {l.details && (
                            <div className="mt-0.5 text-[12.5px] whitespace-pre-wrap text-faint">
                              {l.details}
                            </div>
                          )}
                          {canCost && (sup || l.cost) ? (
                            <div className="mt-0.5 text-[12.5px] text-muted">
                              {sup && l.supplierId && (
                                <Link
                                  href={`/suppliers/${l.supplierId}`}
                                  className="text-info hover:underline"
                                >
                                  {sup}
                                </Link>
                              )}
                              {sup && l.cost ? ' · ' : ''}
                              {l.cost ? (
                                <span className="num">
                                  {t('services.cost')}: {money(l.cost, l.costCurrency ?? currency)}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {operational && (
                      <td>
                        {canWrite && actions.status ? (
                          <ServiceStatusSelect
                            action={actions.status}
                            bookingId={parent.value}
                            lineId={String(l._id)}
                            status={l.status}
                            label={`${t('common.status')} — ${l.description}`}
                          />
                        ) : (
                          <Badge tone={SERVICE_TONE[l.status]}>{t(`services.statuses.${l.status}`)}</Badge>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap">
                      <div className="num font-medium">{money(lineTotal(l))}</div>
                      <div className="num text-[12px] text-muted">
                        {l.qty} × {money(l.unitPrice)}
                      </div>
                    </td>
                  </EditableRow>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={cols - 2} className="text-muted">
                  {t('bookings.subtotal')}
                </td>
                <td className="num">{money(subtotal)}</td>
                <td />
              </tr>
              {discount > 0 && (
                <tr>
                  <td colSpan={cols - 2} className="text-muted">
                    {t('bookings.discount')}
                  </td>
                  <td className="num text-danger">−{money(discount)}</td>
                  <td />
                </tr>
              )}
              <tr>
                <td colSpan={cols - 2} className="font-semibold">
                  {t('bookings.total')}
                </td>
                <td className="num font-semibold">{money(total)}</td>
                <td />
              </tr>
              {canCost && costTotal > 0 && (
                <tr>
                  <td colSpan={cols - 2} className="text-muted">
                    {t('bookings.costTotal')} · {t('bookings.profit')}
                  </td>
                  <td className="num whitespace-nowrap text-muted">
                    {money(costTotal)} ·{' '}
                    <span className={total - costTotal < 0 ? 'text-danger' : 'text-success'}>
                      {money(total - costTotal)}
                    </span>
                  </td>
                  <td />
                </tr>
              )}
            </tfoot>
          </Table>
        </EditableTable>
      )}
      {canWrite && (
        <div className="flex flex-col gap-4 border-t border-line p-5">
          <details open={lines.length === 0}>
            <summary className="cursor-pointer font-medium">{t('services.add')}</summary>
            <div className="mt-4">
              <ServiceForm
                action={actions.save}
                parent={parent}
                suppliers={suppliers}
                packages={packages}
                currency={currency}
                canCost={canCost}
                operational={operational}
              />
            </div>
          </details>
          <DiscountField
            action={actions.discount}
            parent={parent}
            value={discount ? moneyInput(discount, currency) : ''}
          />
          {canCost && rateNote && <p className="m-0 text-[12.5px] text-faint">{rateNote}</p>}
        </div>
      )}
    </Card>
  );
}
