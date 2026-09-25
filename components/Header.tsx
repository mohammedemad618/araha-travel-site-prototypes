'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Wordmark } from './ui/Wordmark';
import { LanguageSwitch } from './LanguageSwitch';
import { OpenWhatsAppButton } from './WhatsApp';

export const NAV = [
  { key: 'home', href: '/', en: 'HOME' },
  { key: 'packages', href: '/packages', en: 'PACKAGES' },
  { key: 'destinations', href: '/destinations', en: 'DESTINATIONS' },
  { key: 'visa', href: '/visa', en: 'VISAS' },
  { key: 'guides', href: '/guides', en: 'GUIDES' },
  { key: 'about', href: '/about', en: 'ABOUT' },
  { key: 'contact', href: '/contact', en: 'CONTACT' },
] as const;

const DESKTOP_QUERY = '(min-width: 73.75rem)';

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => setMenu(false), [pathname]);

  // While the menu is open it behaves as a modal: page scroll is locked, the
  // rest of the page is inert, focus moves into the menu and returns afterwards.
  useEffect(() => {
    if (!menu) return;
    const root = document.documentElement;
    const outside = [...document.querySelectorAll<HTMLElement>('main, footer, [data-inert-with-menu]')];
    root.style.overflow = 'hidden';
    outside.forEach((el) => (el.inert = true));
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const toggle = toggleRef.current;

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onResize = (e: MediaQueryListEvent) => e.matches && setMenu(false);
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onResize);
    return () => {
      root.style.overflow = '';
      outside.forEach((el) => (el.inert = false));
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onResize);
      toggle?.focus({ preventScroll: true });
    };
  }, [menu]);

  const solid = scrolled || menu;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-60 border-b transition-[background-color,border-color] duration-600 ${
          solid ? 'border-ivory/8 bg-ink/90 backdrop-blur-[16px]' : 'border-transparent bg-transparent'
        }`}
      >
        <div
          className={`container-x flex items-center justify-between gap-6 text-ivory transition-[height] duration-500 ${
            scrolled ? 'h-[72px]' : 'h-20 md:h-24'
          }`}
        >
          <Link href="/" className="text-ivory hover:text-ivory">
            <Wordmark />
            <span className="sr-only">{t('home')}</span>
          </Link>

          <nav
            aria-label={t('main')}
            className="hidden items-center gap-[clamp(16px,1.7vw,34px)] text-[14.5px] xl:flex"
          >
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

          <div className="hidden items-center gap-5 xl:flex">
            <LanguageSwitch />
            <OpenWhatsAppButton className="rounded-[1px] border border-gold/70 px-5.5 py-[11px] text-sm text-ivory transition-colors hover:bg-gold hover:text-ink">
              {t('plan')}
            </OpenWhatsAppButton>
          </div>

          <div className="flex items-center gap-5 xl:hidden">
            <span className="hidden md:block">
              <LanguageSwitch />
            </span>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              className="flex min-h-11 items-center gap-3 text-sm text-ivory"
            >
              <span>{menu ? t('close') : t('menu')}</span>
              <span className="flex w-6 flex-col gap-1.5" aria-hidden="true">
                <span className="h-px bg-ivory" />
                <span className="h-px w-4 bg-gold" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div
          ref={menuRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('main')}
          className="fixed inset-0 z-55 flex flex-col justify-between overflow-y-auto bg-ink px-7 pt-[110px] pb-12 text-ivory xl:hidden"
        >
          <nav aria-label={t('main')} className="flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                onClick={() => setMenu(false)}
                aria-current={isActive(n.href) ? 'page' : undefined}
                className="flex items-center justify-between border-b border-ivory/10 py-3 font-display text-[30px] font-normal text-ivory aria-[current=page]:text-gold md:text-[34px]"
              >
                <span>{t(n.key)}</span>
                {locale === 'ar' && (
                  <span lang="en" dir="ltr" aria-hidden="true" className="font-latin text-[11px] text-gold">
                    {n.en}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-4 pt-8">
            <OpenWhatsAppButton className="rounded-[1px] border border-gold/70 px-5 py-3 text-sm text-ivory">
              {t('plan')}
            </OpenWhatsAppButton>
            <LanguageSwitch large />
          </div>
        </div>
      )}
    </>
  );
}
