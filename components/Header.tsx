'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Wordmark } from './ui/Wordmark';
import { LanguageSwitch } from './LanguageSwitch';
import { OpenWhatsAppButton } from './WhatsApp';

export const NAV = [
  { key: 'home', href: '/', en: 'HOME' },
  { key: 'packages', href: '/packages', en: 'PACKAGES' },
  { key: 'destinations', href: '/destinations', en: 'DESTINATIONS' },
  { key: 'services', href: '/#services', en: 'SERVICES' },
  { key: 'about', href: '/about', en: 'ABOUT' },
  { key: 'contact', href: '/contact', en: 'CONTACT' },
] as const;

export function Header() {
  const t = useTranslations('nav');
  const tm = useTranslations('meta');
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation and lock page scroll while it is open.
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = menu ? 'hidden' : '';
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const solid = scrolled || menu;
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : !href.includes('#') && pathname.startsWith(href);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-60 border-b transition-[background-color,border-color] duration-600 ${
          solid ? 'border-ivory/8 bg-ink/90 backdrop-blur-[16px]' : 'border-transparent bg-transparent'
        }`}
      >
        <div
          className={`container-x flex items-center justify-between gap-8 text-ivory transition-[height] duration-500 ${
            scrolled ? 'h-[72px]' : 'h-20 md:h-24'
          }`}
        >
          <Link href="/" className="text-ivory hover:text-ivory" aria-label={`${tm('brandWordmark')} — ${t('home')}`}>
            <Wordmark />
          </Link>

          <nav aria-label={t('main')} className="hidden items-center gap-[clamp(20px,2.4vw,40px)] text-[14.5px] lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={isActive(n.href) ? 'page' : undefined}
                className="py-2 text-ivory opacity-85 transition hover:text-gold hover:opacity-100 aria-[current=page]:text-gold aria-[current=page]:opacity-100"
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5.5 lg:flex">
            <LanguageSwitch />
            <OpenWhatsAppButton className="rounded-[1px] border border-gold/70 px-5.5 py-[11px] text-sm text-ivory transition-colors hover:bg-gold hover:text-ink">
              {t('plan')}
            </OpenWhatsAppButton>
          </div>

          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            className="flex min-h-11 items-center gap-3 text-sm text-ivory lg:hidden"
          >
            <span>{menu ? t('close') : t('menu')}</span>
            <span className="flex w-6 flex-col gap-1.5" aria-hidden="true">
              <span className="h-px bg-ivory" />
              <span className="h-px w-4 bg-gold" />
            </span>
          </button>
        </div>
      </header>

      {menu && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-55 flex flex-col justify-between overflow-y-auto bg-ink px-7 pt-[110px] pb-[120px] text-ivory lg:hidden"
        >
          <nav aria-label={t('main')} className="flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                onClick={() => setMenu(false)}
                className="flex items-center justify-between border-b border-ivory/10 py-3 font-display text-[34px] font-normal text-ivory"
              >
                <span>{t(n.key)}</span>
                <span dir="ltr" className="font-latin text-[11px] text-gold">
                  {n.en}
                </span>
              </Link>
            ))}
          </nav>
          <div className="flex justify-end pt-8">
            <LanguageSwitch large />
          </div>
        </div>
      )}
    </>
  );
}
