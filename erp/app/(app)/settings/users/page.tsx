import type { Metadata } from 'next';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { getDb } from '@/lib/db';
import { formatDateTime } from '@/lib/dates';
import type { User } from '@/lib/types';
import { Badge, Card, PageHeader, Table } from '@/components/ui';
import { SettingsTabs } from '../SettingsTabs';
import { NewUserForm, UserRow } from '../SettingsForms';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const ctx = await requireTenant('users.manage');
  const { t, lang } = await getI18n();
  const db = await getDb();
  const users = await db
    .collection<User>('users')
    .find({ tenantId: ctx.tenantId })
    .sort({ active: -1, name: 1 })
    .toArray();
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <SettingsTabs ctx={ctx} active="users" />
      <Card title={t('settings.newUser')} className="mb-5">
        <NewUserForm />
      </Card>
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.email')}</th>
              <th>{t('settings.role')}</th>
              <th>{t('common.status')}</th>
              <th>{t('settings.lastLogin')}</th>
              <th>
                <span className="sr-only">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = String(u._id) === String(ctx.user._id);
              return (
                <tr key={String(u._id)} className={u.active ? '' : 'opacity-60'}>
                  <td className="font-medium">
                    {u.name} {self && <span className="text-[12.5px] text-muted">{t('settings.you')}</span>}
                  </td>
                  <td className="font-latin text-muted" dir="ltr">
                    {u.email}
                  </td>
                  <td>{t(`roles.${u.role}`)}</td>
                  <td>
                    <Badge tone={u.active ? 'success' : 'neutral'}>
                      {u.active ? t('settings.active') : t('settings.disabled')}
                    </Badge>
                  </td>
                  <td className="text-muted">{formatDateTime(u.lastLoginAt, lang)}</td>
                  <td>
                    <UserRow id={String(u._id)} name={u.name} role={u.role} active={u.active} self={self} />
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
