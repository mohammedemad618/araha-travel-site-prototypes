import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getI18n } from '@/lib/i18n/server';
import { AuthShell } from '@/components/AuthShell';
import { ResetAdminForm } from './ResetAdminForm';

export const metadata: Metadata = { title: 'Recovery' };
export const dynamic = 'force-dynamic';

/** Account recovery for the platform administrator; hidden unless ADMIN_RESET_TOKEN is set. */
export default async function ResetAdminPage() {
  if ((process.env.ADMIN_RESET_TOKEN ?? '').length < 32) notFound();
  const { t } = await getI18n();
  return (
    <AuthShell title={t('auth.resetTitle')} intro={t('auth.resetIntro')}>
      <ResetAdminForm />
    </AuthShell>
  );
}
