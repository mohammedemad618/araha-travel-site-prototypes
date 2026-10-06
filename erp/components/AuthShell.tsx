import { getI18n } from '@/lib/i18n/server';
import { LanguageToggle } from './LanguageToggle';

/** Centered card used by sign-in, setup and password pages. */
export async function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-ink px-4 py-12">
      <div className="mb-8 flex items-center gap-3 text-white">
        <span className="h-3 w-3 rotate-45 bg-gold" aria-hidden="true" />
        <span className="text-[22px] font-semibold">{t('app.name')}</span>
        <span className="text-[13px] text-white/60">· {t('app.suite')}</span>
      </div>
      <div className="w-full max-w-[420px] rounded-2xl bg-surface p-7 shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <h1 className="m-0 text-[22px] font-semibold">{title}</h1>
        {intro && <p className="m-0 mt-2 text-[14px] text-muted">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-6 text-white/70">
        <LanguageToggle tone="dark" />
      </div>
    </main>
  );
}
