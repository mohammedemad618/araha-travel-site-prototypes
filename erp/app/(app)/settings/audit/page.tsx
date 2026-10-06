import type { Metadata } from 'next';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { getStaff, pageParams, PAGE_SIZE } from '@/lib/queries';
import { formatDateTime } from '@/lib/dates';
import type { AuditLog } from '@/lib/types';
import { Card, PageHeader, Table } from '@/components/ui';
import { Pagination } from '@/components/ListControls';
import { SettingsTabs } from '../SettingsTabs';

export const metadata: Metadata = { title: 'Audit log' };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await requireTenant('audit.read');
  const { t, lang } = await getI18n();
  const { page, skip } = pageParams((await searchParams).page);
  const db = await getDb();
  const [rows, total, staff] = await Promise.all([
    db
      .collection<AuditLog>('auditLogs')
      .find({ tenantId: ctx.tenantId })
      .sort({ at: -1 })
      .skip(skip)
      .limit(PAGE_SIZE)
      .toArray(),
    db.collection<AuditLog>('auditLogs').countDocuments({ tenantId: ctx.tenantId }),
    getStaff(ctx.tenantId),
  ]);
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <SettingsTabs ctx={ctx} active="audit" />
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t('settings.auditWhen')}</th>
              <th>{t('settings.auditUser')}</th>
              <th>{t('settings.auditAction')}</th>
              <th>{t('common.details')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r._id)}>
                <td className="whitespace-nowrap text-muted">{formatDateTime(r.at, lang)}</td>
                <td>{staff.find((s) => s.id === String(r.userId))?.name ?? t('roles.platform')}</td>
                <td className="font-latin text-[13px]" dir="ltr">
                  {r.action}
                </td>
                <td className="max-w-[420px] truncate">{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination base="/settings/audit" params={{}} page={page} total={total} />
      </Card>
    </>
  );
}
