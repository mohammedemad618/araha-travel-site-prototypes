import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getCtx } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const db = await getDb();
  // A fresh installation goes to the one-time setup page.
  if ((await db.collection('users').estimatedDocumentCount()) === 0) redirect('/setup');
  const ctx = await getCtx();
  if (ctx) redirect(ctx.role === 'platform' && !ctx.tenant ? '/platform' : '/');
  const { t } = await getI18n();
  const { next } = await searchParams;
  return (
    <AuthShell title={t('auth.loginTitle')} intro={t('auth.loginIntro')}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
