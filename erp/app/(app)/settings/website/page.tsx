import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { formatDateTime } from '@/lib/dates';
import { Card, PageHeader } from '@/components/ui';
import { CopyButton } from '@/components/CopyButton';
import { SettingsTabs } from '../SettingsTabs';
import { RegenerateKeyButton, WebsiteForm } from '../SettingsForms';

export const metadata: Metadata = { title: 'Website connection' };

function Row({
  label,
  value,
  hint,
  extra,
}: {
  label: string;
  value: string;
  hint?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-3">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg border border-line bg-canvas px-3 py-2 font-latin text-[13px]"
          dir="ltr"
        >
          {value}
        </code>
        <CopyButton value={value} />
        {extra}
      </div>
      {hint && <p className="m-0 text-[12px] text-faint">{hint}</p>}
    </div>
  );
}

export default async function WebsiteSettingsPage() {
  const ctx = await requireTenant('settings.manage');
  const { t, lang } = await getI18n();
  const h = await headers();
  const origin = process.env.PUBLIC_URL || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  const w = ctx.tenant.website;
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <SettingsTabs ctx={ctx} active="website" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title={t('settings.setupSteps')}>
          <div className="flex flex-col gap-5">
            <Row label={t('settings.endpoint')} value={origin} hint={t('settings.endpointHint')} />
            <Row
              label={t('settings.apiKey')}
              value={w.apiKey}
              hint={t('settings.apiKeyHint')}
              extra={<RegenerateKeyButton />}
            />
            <Row label={t('settings.catalog')} value={`${origin}/api/public/v1/catalog?key=${w.apiKey}`} />
            {w.lastPublishedAt && (
              <p className="m-0 text-[13px] text-muted">
                {t('inventory.lastPublished', { date: formatDateTime(w.lastPublishedAt, lang) })}
              </p>
            )}
          </div>
        </Card>
        <Card title={t('settings.website')}>
          <WebsiteForm siteUrl={w.siteUrl} buildHookUrl={w.buildHookUrl} allowedOrigins={w.allowedOrigins} />
        </Card>
      </div>
    </>
  );
}
