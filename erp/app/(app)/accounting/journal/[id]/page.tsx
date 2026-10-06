import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { branchName, requireTenant, toObjectId } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { getStaff } from '@/lib/queries';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { accountLabel } from '@/lib/accounting/labels';
import { sourceHref } from '@/lib/accounting/sources';
import { Badge, Card, DL, PageHeader, Table } from '@/components/ui';
import { ReverseEntryButton } from '../../AccountingForms';

export const metadata: Metadata = { title: 'Journal entry' };

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  const id = toObjectId((await params).id);
  if (!id) notFound();
  const r = await repo(ctx);
  const e = await r.journalEntries.findOne({ _id: id });
  if (!e) notFound();
  const [accounts, staff, customers, suppliers, reversal] = await Promise.all([
    r.accounts.find({ _id: { $in: e.lines.map((l) => l.accountId) } }).toArray(),
    getStaff(ctx.tenantId),
    r.customers
      .find(
        { _id: { $in: e.lines.filter((l) => l.party?.type === 'customer').map((l) => l.party!.id) } },
        { projection: { name: 1 } },
      )
      .toArray(),
    r.suppliers
      .find(
        { _id: { $in: e.lines.filter((l) => l.party?.type === 'supplier').map((l) => l.party!.id) } },
        { projection: { name: 1 } },
      )
      .toArray(),
    e.reversedBy ? r.journalEntries.findOne({ _id: e.reversedBy }, { projection: { number: 1 } }) : null,
  ]);
  const cur = ctx.tenant.settings.currency;
  const money = (v: number) => (v ? formatMoney(v, cur, lang) : '');
  const party = (p?: { type: string; id: unknown }) =>
    p
      ? (p.type === 'customer' ? customers : suppliers).find((x) => String(x._id) === String(p.id))?.name
      : undefined;
  const href = sourceHref(e);

  return (
    <>
      <PageHeader
        back={{ href: '/accounting/journal', label: t('accounting.journal') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-latin">{e.number}</span>
            <Badge>{t(`accounting.sources.${e.source.type}`)}</Badge>
            {e.reversedBy && <Badge tone="danger">{t('accounting.reversed')}</Badge>}
          </span>
        }
        intro={e.memo}
        actions={
          can(ctx.role, 'accounting.write') &&
          e.source.type === 'manual' &&
          !e.reversedBy && <ReverseEntryButton id={String(e._id)} />
        }
      />
      <Card className="mb-5">
        <DL
          cols={3}
          items={[
            [t('common.date'), formatDate(e.date, lang)],
            [
              t('accounting.source'),
              href ? (
                <Link key="s" href={href} className="text-info hover:underline">
                  {e.source.ref ?? t(`accounting.sources.${e.source.type}`)}
                </Link>
              ) : (
                (e.source.ref ?? t(`accounting.sources.${e.source.type}`))
              ),
            ],
            ...(e.branchId && ctx.allBranches.length > 1
              ? [[t('workspace.branch'), branchName(ctx, e.branchId) ?? '—'] as [string, string]]
              : []),
            [
              t('common.by'),
              e.createdBy ? staff.find((s) => s.id === String(e.createdBy))?.name : t('accounting.automatic'),
            ],
            [t('common.createdAt'), formatDateTime(e.createdAt, lang)],
            ...(reversal
              ? [
                  [
                    t('accounting.reversedBy'),
                    <Link
                      key="r"
                      href={`/accounting/journal/${reversal._id}`}
                      className="font-latin text-info hover:underline"
                    >
                      {reversal.number}
                    </Link>,
                  ] as [string, React.ReactNode],
                ]
              : []),
          ]}
        />
      </Card>
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t('accounting.account')}</th>
              <th>{t('accounting.party')}</th>
              <th>{t('accounting.lineMemo')}</th>
              <th>{t('accounting.debit')}</th>
              <th>{t('accounting.credit')}</th>
            </tr>
          </thead>
          <tbody>
            {e.lines.map((l, i) => {
              const a = accounts.find((x) => String(x._id) === String(l.accountId));
              return (
                <tr key={i}>
                  <td>
                    {a ? (
                      <Link href={`/accounting/accounts/${a._id}`} className="hover:underline">
                        <span className="font-latin text-faint">{a.code}</span> {accountLabel(a, t)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-muted">{party(l.party) ?? '—'}</td>
                  <td className="text-muted">{l.memo ?? ''}</td>
                  <td className="num">{money(l.debit)}</td>
                  <td className="num">{money(l.credit)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={3}>{t('common.sum')}</td>
              <td className="num">{formatMoney(e.total, cur, lang)}</td>
              <td className="num">{formatMoney(e.total, cur, lang)}</td>
            </tr>
          </tfoot>
        </Table>
      </Card>
    </>
  );
}
