import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone, Plus } from 'lucide-react';
import { requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { waLink } from '@/lib/phone';
import { paymentState } from '@/lib/bookings';
import { BOOKING_TONE, PAY_TONE, VISA_TONE } from '@/lib/ui-tones';
import { Badge, Card, DL, LinkButton, PageHeader, Table, buttonClass } from '@/components/ui';
import { Timeline } from '@/components/crm/Timeline';
import { RelatedTasks } from '@/components/crm/RelatedTasks';
import { Attachments } from '@/components/crm/Attachments';
import { CustomerForm } from '../CustomerForm';
import { DeleteCustomerButton, DeleteTravellerButton, TravellerForm } from './TravellerForm';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('customers.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const c = await r.customers.findOne({ _id: id });
  if (!c) notFound();
  const [bookings, visas] = await Promise.all([
    can(ctx.role, 'bookings.read')
      ? r.bookings.find({ customerId: id }).sort({ createdAt: -1 }).toArray()
      : [],
    can(ctx.role, 'visas.read') ? r.visas.find({ customerId: id }).sort({ createdAt: -1 }).toArray() : [],
  ]);
  const canWrite = can(ctx.role, 'customers.write');
  const today = todayISO();
  const soon = addDays(today, 183);
  const active = bookings.filter((b) => b.status !== 'cancelled');
  const byCur = (cur: 'IQD' | 'USD') => active.filter((b) => b.currency === cur);
  const sumLine = (key: 'total' | 'due') =>
    (['IQD', 'USD'] as const)
      .map((cur) => {
        const list = byCur(cur);
        if (!list.length) return null;
        const v = list.reduce((s, b) => s + (key === 'total' ? b.total : b.total - b.paid), 0);
        return formatMoney(v, cur, lang);
      })
      .filter(Boolean)
      .join(' + ') || '—';

  return (
    <>
      <PageHeader
        back={{ href: '/customers', label: t('customers.title') }}
        title={c.name}
        intro={
          <span className="flex flex-wrap gap-1.5">
            {c.tags.map((tag) => (
              <Badge key={tag} tone="gold">
                {tag}
              </Badge>
            ))}
            {c.source && <Badge>{t(`leads.sources.${c.source}`)}</Badge>}
          </span>
        }
        actions={
          <>
            <a
              href={waLink(c.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('secondary')}
            >
              <MessageCircle size={16} aria-hidden="true" /> {t('common.whatsapp')}
            </a>
            <a href={`tel:${c.phone}`} className={buttonClass('secondary')}>
              <Phone size={16} aria-hidden="true" /> {t('common.call')}
            </a>
            {can(ctx.role, 'bookings.write') && (
              <LinkButton href={`/bookings/new?customer=${c._id}`} variant="primary" icon={Plus}>
                {t('bookings.new')}
              </LinkButton>
            )}
            {can(ctx.role, 'visas.write') && (
              <LinkButton href={`/visas/new?customer=${c._id}`}>{t('visas.new')}</LinkButton>
            )}
            {canWrite && <DeleteCustomerButton id={String(c._id)} />}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={t('common.details')}>
            <DL
              cols={3}
              items={[
                [
                  t('common.phone'),
                  <span key="p" dir="ltr" className="font-latin">
                    {c.phone}
                  </span>,
                ],
                [
                  t('customers.phone2'),
                  c.phone2 ? (
                    <span dir="ltr" className="font-latin">
                      {c.phone2}
                    </span>
                  ) : undefined,
                ],
                [t('common.email'), c.email],
                [t('common.city'), c.city],
                [t('customers.totalSpent'), sumLine('total')],
                [t('customers.balance'), sumLine('due')],
              ]}
            />
            {c.notes && (
              <p className="m-0 mt-4 rounded-lg bg-canvas p-3 text-[14px] whitespace-pre-wrap">{c.notes}</p>
            )}
            {canWrite && (
              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer font-medium">{t('common.edit')}</summary>
                <div className="mt-4">
                  <CustomerForm
                    values={{
                      id: String(c._id),
                      name: c.name,
                      phone: c.phone,
                      phone2: c.phone2,
                      email: c.email,
                      city: c.city,
                      notes: c.notes,
                      tags: c.tags.join('، '),
                      source: c.source,
                    }}
                  />
                </div>
              </details>
            )}
          </Card>

          <Card title={`${t('customers.travellers')} (${c.travellers.length})`} padded={false}>
            {c.travellers.length === 0 ? (
              <p className="m-0 p-5 text-[13.5px] text-muted">{t('customers.noTravellers')}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('customers.relation')}</th>
                    <th>{t('customers.birthDate')}</th>
                    <th>{t('customers.passportNo')}</th>
                    <th>{t('customers.passportExpiry')}</th>
                    <th>
                      <span className="sr-only">{t('common.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.travellers.map((tr) => {
                    const exp = tr.passportExpiry;
                    return (
                      <tr key={String(tr._id)}>
                        <td>
                          <div className="font-medium">{tr.name}</div>
                          {tr.nameEn && (
                            <div className="font-latin text-[12.5px] text-muted" dir="ltr">
                              {tr.nameEn}
                            </div>
                          )}
                        </td>
                        <td>{tr.relation ?? '—'}</td>
                        <td>{tr.birthDate ? formatDate(tr.birthDate, lang) : '—'}</td>
                        <td className="font-latin" dir="ltr">
                          {tr.passportNo ?? '—'}
                        </td>
                        <td>
                          {exp ? (
                            <span className="flex items-center gap-2">
                              {formatDate(exp, lang)}
                              {exp < today ? (
                                <Badge tone="danger">{t('customers.passportExpired')}</Badge>
                              ) : exp < soon ? (
                                <Badge tone="warning">{t('customers.passportExpiring')}</Badge>
                              ) : null}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {canWrite && (
                            <div className="flex items-center justify-end gap-1">
                              <details className="relative">
                                <summary className={buttonClass('ghost', 'sm', 'list-none')}>
                                  {t('common.edit')}
                                </summary>
                                <div className="absolute end-0 z-20 mt-2 w-[min(720px,90vw)] rounded-xl border border-line bg-surface p-4 shadow-xl">
                                  <TravellerForm
                                    customerId={String(c._id)}
                                    values={{
                                      travellerId: String(tr._id),
                                      name: tr.name,
                                      nameEn: tr.nameEn,
                                      relation: tr.relation,
                                      birthDate: tr.birthDate,
                                      gender: tr.gender,
                                      passportNo: tr.passportNo,
                                      passportExpiry: tr.passportExpiry,
                                      nationality: tr.nationality,
                                    }}
                                  />
                                </div>
                              </details>
                              <DeleteTravellerButton
                                customerId={String(c._id)}
                                travellerId={String(tr._id)}
                              />
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
              <details className="border-t border-line px-5 py-4">
                <summary className="cursor-pointer font-medium">{t('customers.addTraveller')}</summary>
                <div className="mt-4">
                  <TravellerForm customerId={String(c._id)} />
                </div>
              </details>
            )}
          </Card>

          {bookings.length > 0 && (
            <Card title={t('customers.bookings')} padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>{t('bookings.number')}</th>
                    <th>{t('bookings.titleField')}</th>
                    <th>{t('bookings.travelDate')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('bookings.total')}</th>
                    <th>{t('bookings.balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={String(b._id)}>
                      <td>
                        <Link href={`/bookings/${b._id}`} className="font-latin font-medium hover:underline">
                          {b.number}
                        </Link>
                      </td>
                      <td>{b.title}</td>
                      <td>{b.travelDate ? formatDate(b.travelDate, lang) : '—'}</td>
                      <td>
                        <Badge tone={BOOKING_TONE[b.status]}>{t(`bookings.statuses.${b.status}`)}</Badge>
                      </td>
                      <td className="num">{formatMoney(b.total, b.currency, lang)}</td>
                      <td>
                        <Badge tone={PAY_TONE[paymentState(b)]}>
                          {formatMoney(b.total - b.paid, b.currency, lang)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          {visas.length > 0 && (
            <Card title={t('customers.visas')} padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>{t('visas.traveller')}</th>
                    <th>{t('visas.country')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('visas.expectedAt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visas.map((v) => (
                    <tr key={String(v._id)}>
                      <td>
                        <Link href={`/visas/${v._id}`} className="font-medium hover:underline">
                          {v.travellerName}
                        </Link>
                      </td>
                      <td>{v.country}</td>
                      <td>
                        <Badge tone={VISA_TONE[v.status]}>{t(`visas.statuses.${v.status}`)}</Badge>
                      </td>
                      <td>{v.expectedAt ? formatDate(v.expectedAt, lang) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Timeline tenantId={ctx.tenantId} type="customer" id={id} />
          <RelatedTasks
            tenantId={ctx.tenantId}
            userId={ctx.user._id}
            type="customer"
            id={id}
            path={`/customers/${id}`}
          />
          <Attachments tenantId={ctx.tenantId} type="customer" id={id} canWrite={canWrite} />
        </div>
      </div>
    </>
  );
}
