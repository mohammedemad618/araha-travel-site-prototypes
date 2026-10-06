import { requireCtx } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { Card, PageHeader } from '@/components/ui';
import { PasswordForm } from './PasswordForm';

export default async function PasswordPage() {
  const ctx = await requireCtx();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader
        title={t('auth.changePassword')}
        intro={ctx.user.mustChangePassword ? t('auth.mustChange') : undefined}
      />
      <Card>
        <PasswordForm />
      </Card>
    </>
  );
}
