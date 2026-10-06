import { getI18n } from '@/lib/i18n/server';
import { AuthShell } from '@/components/AuthShell';
import { logout } from '@/lib/actions/auth';
import { buttonClass } from '@/components/ui';

export default async function SuspendedPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t('auth.suspendedTitle')} intro={t('auth.suspendedBody')}>
      <form action={logout}>
        <button type="submit" className={buttonClass('secondary', 'md', 'w-full')}>
          {t('common.signOut')}
        </button>
      </form>
    </AuthShell>
  );
}
