import type { Metadata } from 'next';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { repo } from '@/lib/repo';
import { formatDateTime } from '@/lib/dates';
import type { User } from '@/lib/types';
import { Badge, Card, PageHeader, Table } from '@/components/ui';
import { SettingsTabs } from '../SettingsTabs';
import { NewUserForm, UserRow } from '../SettingsForms';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const ctx = await requireTenant('users.manage');
  const { t, lang } = await getI18n();
  const r = await repo(ctx);
  const members = await r.memberships.find().toArray();
  const users = await (
    await getDb()
  )
    .collection<User>('users')
    .find({ _id: { $in: members.map((m) => m.userId) } }, { projection: { passwordHash: 0 } })
    .toArray();
  const rows = members
    .map((m) => ({ m, u: users.find((u) => String(u._id) === String(m.userId))! }))
    .filter((x) => x.u)
    .sort((a, b) => Number(b.m.active) - Number(a.m.active) || a.u.name.localeCompare(b.u.name));
  const branches = ctx.allBranches.filter((b) => b.active).map((b) => ({ id: String(b._id), name: b.name }));
  const branchNames = (ids: unknown[]) =>
    ids
      .map((id) => ctx.allBranches.find((b) => String(b._id) === String(id))?.name)
      .filter(Boolean)
      .join('، ');

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <SettingsTabs ctx={ctx} active="users" />
      <Card title={t('settings.newUser')} className="mb-5">
        <NewUserForm branches={branches} />
      </Card>
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('settings.role')}</th>
              <th>{t('settings.scope')}</th>
              <th>{t('common.status')}</th>
              <th>{t('settings.lastLogin')}</th>
              <th>
                <span className="sr-only">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, u }) => {
              const self = String(u._id) === String(ctx.user._id);
              return (
                <tr key={String(m._id)} className={m.active ? '' : 'opacity-60'}>
                  <td className="font-medium">
                    {u.name} {self && <span className="text-[12.5px] text-muted">{t('settings.you')}</span>}
                  </td>
                  <td className="font-latin text-muted" dir="ltr">
                    {u.email}
                  </td>
                  <td>{t(`roles.${m.role}`)}</td>
                  <td className="text-muted">
                    {t(`settings.scopes.${m.scope}`)}
                    {m.branchIds.length > 0 && (
                      <span className="block text-[12.5px] text-faint">{branchNames(m.branchIds)}</span>
                    )}
                  </td>
                  <td>
                    <Badge tone={m.active ? 'success' : 'neutral'}>
                      {m.active ? t('settings.active') : t('settings.disabled')}
                    </Badge>
                  </td>
                  <td className="text-muted">{formatDateTime(u.lastLoginAt, lang)}</td>
                  <td>
                    <UserRow
                      id={String(u._id)}
                      name={u.name}
                      access={{ role: m.role, scope: m.scope, branchIds: m.branchIds.map(String) }}
                      branches={branches}
                      active={m.active}
                      self={self}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
