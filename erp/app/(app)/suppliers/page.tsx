import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import type { Filter } from 'mongodb';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { can } from '@/lib/rbac';
import { searchRegex } from '@/lib/queries';
import { supplierBalances } from '@/lib/suppliers';
import { formatMulti } from '@/lib/money-multi';
import { supplierTypes, type Supplier } from '@/lib/types';
import { Card, EmptyState, PageHeader, Table } from '@/components/ui';
import { FilterBar } from '@/components/ListControls';
import { SupplierForm } from './SupplierForms';

export const metadata: Metadata = { title: 'Suppliers' };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const ctx = await requireTenant('suppliers.read');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const r = await repo(ctx);
  const filter: Filter<Supplier> = {};
  if (sp.q?.trim()) filter.name = searchRegex(sp.q.trim());
  if (sp.type && (supplierTypes as readonly string[]).includes(sp.type))
    filter.type = sp.type as Supplier['type'];
  const suppliers = await r.suppliers.find(filter).sort({ name: 1 }).limit(500).toArray();
  const balances = await supplierBalances(
    ctx.tenantId,
    suppliers.map((s) => s._id),
  );
  const seeFinance = can(ctx.role, 'finance.read');

  return (
    <>
      <PageHeader title={t('suppliers.title')} intro={t('suppliers.intro')} />
      {can(ctx.role, 'suppliers.write') && (
        <Card className="mb-5">
          <details>
            <summary className="cursor-pointer font-semibold">{t('suppliers.new')}</summary>
            <div className="mt-5">
              <SupplierForm />
            </div>
          </details>
        </Card>
      )}
      <FilterBar
        q={sp.q}
        selects={[
          {
            name: 'type',
            label: t('suppliers.type'),
            value: sp.type,
            options: supplierTypes.map((s) => ({ value: s, label: t(`suppliers.types.${s}`) })),
          },
        ]}
      />
      <Card padded={false}>
        {suppliers.length === 0 ? (
          <EmptyState icon={Building2} title={t('common.noResults')} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('suppliers.type')}</th>
                <th>{t('suppliers.country')}</th>
                <th>{t('suppliers.contactName')}</th>
                {seeFinance && <th>{t('suppliers.owed')}</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const b = balances.get(String(s._id));
                const owed = b ? { IQD: b.costs.IQD - b.paid.IQD, USD: b.costs.USD - b.paid.USD } : {};
                return (
                  <tr key={String(s._id)}>
                    <td>
                      <Link href={`/suppliers/${s._id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td>{t(`suppliers.types.${s.type}`)}</td>
                    <td>{s.country ?? '—'}</td>
                    <td className="text-muted">{s.contactName ?? '—'}</td>
                    {seeFinance && <td className="num">{formatMulti(owed, lang)}</td>}
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
