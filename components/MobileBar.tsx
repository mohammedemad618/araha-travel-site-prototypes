'use client';

import { Map, Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useWhatsApp } from './WhatsApp';
import { WhatsAppGlyph } from './ui/Icon';

/** Bottom navigation on phones. Package pages render their own booking bar instead. */
export function MobileBar() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { toggle } = useWhatsApp();
  const pathname = usePathname();
  if (/^\/packages\/[^/]+\/?$/.test(pathname)) return null;

  return (
    <nav
      aria-label={t('main')}
      className="fixed inset-x-0 bottom-0 z-70 grid grid-cols-[1fr_1fr_1.25fr] gap-2 border-t border-ivory/10 bg-ink/96 px-2.5 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-[14px] md:hidden"
    >
      <Link
        href="/packages"
        className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[13.5px] text-ivory"
      >
        <Package size={18} strokeWidth={1.5} className="text-gold" aria-hidden="true" />
        {t('packages')}
      </Link>
      <Link
        href="/destinations"
        className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[13.5px] text-ivory"
      >
        <Map size={18} strokeWidth={1.5} className="text-gold" aria-hidden="true" />
        {t('destinations')}
      </Link>
      <button
        type="button"
        onClick={toggle}
        className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-[2px] bg-gold text-[15px] font-medium text-ink"
      >
        <WhatsAppGlyph size={18} />
        {tc('whatsapp')}
      </button>
    </nav>
  );
}
