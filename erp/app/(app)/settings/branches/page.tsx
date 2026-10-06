import type { Metadata } from 'next';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { Badge, Card, PageHeader } from '@/components/ui';
import { SettingsTabs } from '../SettingsTabs';
import { BranchForm, ToggleBranchButton } from '../SettingsForms';

export const metadata: Metadata = { title: 'Branches' };

export default async function BranchesPage() {
  const ctx = await requireTenant('settings.manage');
  const { t } = await getI18n();
  const r = await repo(ctx);
  // Open records per branch, so staff can see where the work is.
  const counts = await r.all.bookings
    .aggregate<{ _id: unknown; n: number }>([
      { $match: { status: { $in: ['draft', 'confirmed'] } } },
      { $group: { _id: '$branchId', n: { $sum: 1 } } },
    ])
    .toArray();
  const open = (id: unknown) => counts.find((c) => String(c._id) === String(id))?.n ?? 0;
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <SettingsTabs ctx={ctx} active="branches" />
      <Card title={t('settings.newBranch')} className="mb-5">
        <p className="m-0 mb-4 text-[13px] text-muted">{t('settings.branchesIntro')}</p>
        <BranchForm />
      </Card>
      <Card title={t('settings.branches')}>
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {ctx.allBranches.map((b) => (
            <li key={String(b._id)} className={`py-4 ${b.active ? '' : 'opacity-60'}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.name}</span>
                <span className="font-latin text-[12.5px] text-muted">{b.code}</span>
                {b.isMain && <Badge tone="info">{t('settings.mainBranch')}</Badge>}
                {!b.active && <Badge>{t('settings.closed')}</Badge>}
                <span className="text-[12.5px] text-faint">
                  {t('nav.bookings')}: <span className="num">{open(b._id)}</span>
                </span>
                {!b.isMain && (
                  <span className="ms-auto">
                    <ToggleBranchButton id={String(b._id)} active={b.active} />
                  </span>
                )}
              </div>
              <BranchForm
                branch={{
                  id: String(b._id),
                  name: b.name,
                  code: b.code,
                  phone: b.phone,
                  address: b.address,
                }}
              />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
