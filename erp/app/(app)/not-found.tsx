import { SearchX } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';
import { EmptyState, LinkButton } from '@/components/ui';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="card">
      <EmptyState
        icon={SearchX}
        title={t('errors.pageNotFound')}
        body={t('errors.pageNotFoundBody')}
        action={<LinkButton href="/">{t('nav.dashboard')}</LinkButton>}
      />
    </div>
  );
}
