import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { pageParams, PAGE_SIZE, searchRegex } from '@/lib/queries';
import { formatDate, isISODate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { ensureLedger } from '@/lib/accounting/ledger';
import { sourceHref } from '@/lib/accounting/sources';
import { journalSources, type JournalEntry } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, buttonClass } from '@/components/ui';
import { Pagination } from '@/components/ListControls';
import { AccountingTabs } from '../AccountingTabs';

export const metadata: Metadata = { title: 'Journal' };

type SP = { q?: string; type?: string; from?: string; to?: string; page?: string };

export default async function JournalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireTenant('accounting.read');
  const { t, lang } = await getI18n();
  await ensureLedger(ctx.tenantId);
  const sp = await searchParams;
  const r = await repo(ctx);
  const filter: Filter<JournalEntry> = {};
  if (sp.type && (journalSources as readonly string[]).includes(sp.type))
    filter['source.type'] = sp.type as JournalEntry['source']['type'];
  const range: Record<string, string> = {};
  if (sp.from && isISODate(sp.from)) range.$gte = sp.from;
  if (sp.to && isISODate(sp.to)) range.$lte = sp.to;
  if (Object.keys(range).length) filter.date = range;
  if (sp.q?.trim()) {
    const re = searchRegex(sp.q.trim());
    filter.$or = [{ number: re }, { memo: re }, { 'source.ref': re }];
  }
  const { page, skip } = pageParams(sp.page);
  const [items, total] = await Promise.all([
    r.journalEntries.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(PAGE_SIZE).toArray(),
    r.journalEntries.countDocuments(filter),
  ]);
  const cur = ctx.tenant.settings.currency;

  return (
    <>
      <PageHeader
        title={t('accounting.title')}
        actions={
          can(ctx.role, 'accounting.write') && (
            <LinkButton href="/accounting/journal/new" variant="primary" icon={Plus}>
              {t('accounting.manualEntry')}
            </LinkButton>
          )
        }
      />
      <AccountingTabs active="journal" />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('common.search')}
          <input name="q" defaultValue={sp.q} className="field-input w-48" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('accounting.source')}
          <select name="type" defaultValue={sp.type ?? ''} className="field-input">
            <option value="">{t('common.all')}</option>
            {journalSources.map((s) => (
              <option key={s} value={s}>
                {t(`accounting.sources.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.from')}
          <input type="date" name="from" defaultValue={sp.from} className="field-input" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t('reports.to')}
          <input type="date" name="to" defaultValue={sp.to} className="field-input" />
        </label>
        <button type="submit" className={buttonClass('secondary')}>
          {t('common.filter')}
        </button>
      </form>
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={BookOpen} title={t('common.noResults')} body={t('accounting.howItWorks')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('accounting.entryNo')}</th>
                <th>{t('common.date')}</th>
                <th>{t('accounting.memo')}</th>
                <th>{t('accounting.source')}</th>
                <th>{t('common.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const href = sourceHref(e);
                return (
                  <tr key={String(e._id)} className={e.reversedBy ? 'opacity-55' : ''}>
                    <td>
                      <Link
                        href={`/accounting/journal/${e._id}`}
                        className="font-latin font-medium whitespace-nowrap hover:underline"
                      >
                        {e.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(e.date, lang)}</td>
                    <td className="max-w-[320px] truncate">{e.memo || '—'}</td>
                    <td>
                      {href ? (
                        <Link href={href} className="hover:underline">
                          <Badge>{t(`accounting.sources.${e.source.type}`)}</Badge>
                        </Link>
                      ) : (
                        <Badge>{t(`accounting.sources.${e.source.type}`)}</Badge>
                      )}
                    </td>
                    <td className="num whitespace-nowrap">{formatMoney(e.total, cur, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination
          base="/accounting/journal"
          params={{ q: sp.q, type: sp.type, from: sp.from, to: sp.to }}
          page={page}
          total={total}
        />
      </Card>
    </>
  );
}
