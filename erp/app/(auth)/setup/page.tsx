import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getI18n } from '@/lib/i18n/server';
import { AuthShell } from '@/components/AuthShell';
import { SetupForm } from './SetupForm';

export const metadata: Metadata = { title: 'Setup' };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const db = await getDb();
  if ((await db.collection('users').estimatedDocumentCount()) > 0) redirect('/login');
  const { t } = await getI18n();
  return (
    <AuthShell title={t('auth.setupTitle')} intro={t('auth.setupIntro')}>
      <SetupForm />
    </AuthShell>
  );
}
