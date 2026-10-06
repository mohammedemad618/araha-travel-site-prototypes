import { headers } from 'next/headers';
import { Languages } from 'lucide-react';
import { setLanguage } from '@/lib/actions/auth';
import { getI18n } from '@/lib/i18n/server';

export async function LanguageToggle({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { lang, t } = await getI18n();
  const back = (await headers()).get('x-pathname') ?? '/';
  return (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === 'ar' ? 'en' : 'ar'} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        lang={lang === 'ar' ? 'en' : 'ar'}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${
          tone === 'dark'
            ? 'text-white/75 hover:bg-white/10 hover:text-white'
            : 'text-muted hover:bg-ink/5 hover:text-ink'
        }`}
      >
        <Languages size={15} aria-hidden="true" />
        {t('common.language')}
      </button>
    </form>
  );
}
