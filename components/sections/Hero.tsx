'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Home } from '@/lib/schema';
import type { Locale } from '@/i18n/routing';
import { Arrow } from '../ui/Arrow';
import { OpenWhatsAppButton } from '../WhatsApp';

const INTERVAL = 7000;

export function Hero({ hero }: { hero: Home['hero'] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('home');
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const count = hero.slides.length;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || count < 2) return;
    const id = window.setTimeout(() => setCur((c) => (c + 1) % count), INTERVAL);
    return () => window.clearTimeout(id);
  }, [playing, cur, count]);

  const go = useCallback((i: number) => setCur(i), []);
  const current = hero.slides[cur] ?? hero.slides[0]!;

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label={t('sliderLabel')}
      className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-ink text-ivory"
    >
      {hero.slides.map((s, i) => {
        const active = i === cur;
        return (
          <div
            key={s.image.src}
            aria-hidden={!active}
            className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out"
            style={{ opacity: active ? 1 : 0, zIndex: active ? 2 : 1 }}
          >
            <div data-parallax="0.18" className="absolute inset-x-0 -top-[10%] -bottom-[10%]">
              <div
                className="absolute inset-0 bg-slate"
                style={{
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                  transition: active ? 'transform 9s linear' : 'transform 0s linear 1.8s',
                }}
              >
                <Image
                  src={s.image.src}
                  alt={s.image.alt[locale]}
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        );
      })}

      <div
        className="pointer-events-none absolute inset-0 z-3"
        style={{
          background:
            'linear-gradient(to top,rgba(11,29,38,.94) 0%,rgba(11,29,38,.45) 42%,rgba(11,29,38,.2) 70%,rgba(11,29,38,.6) 100%)',
        }}
      />

      <div className="pointer-events-none relative z-4 flex flex-col justify-end pt-[120px] pb-[196px] lg:pb-[clamp(120px,17vh,190px)]">
        <div className="container-x">
          <div className="mb-7 flex items-center gap-3.5">
            <span className="h-px w-10 bg-gold" aria-hidden="true" />
            <span dir="ltr" className="font-latin text-[10px] font-semibold tracking-[0.2em] text-gold md:text-[11px] md:tracking-[0.32em]">
              {hero.eyebrow}
            </span>
          </div>
          <h1
            className={`m-0 mb-7 font-display leading-[1.04] font-medium tracking-[-0.015em] text-balance ${
              locale === 'ar' ? 'max-w-[11ch] text-[clamp(52px,8.6vw,138px)]' : 'max-w-[13ch] text-[clamp(44px,7.4vw,120px)]'
            }`}
          >
            <span className="block">{hero.headline[0][locale]}</span>
            <span className="block font-light text-sand">{hero.headline[1][locale]}</span>
          </h1>
          <p className="m-0 mb-10 max-w-[520px] text-[clamp(16px,1.35vw,19px)] leading-[1.85] font-light text-mist">
            {hero.intro[locale]}
          </p>
          <div className="pointer-events-auto flex flex-wrap gap-3.5">
            <Link
              href="/packages"
              className="flex items-center gap-3.5 rounded-[1px] bg-gold px-[34px] py-[17px] text-[15.5px] font-medium text-ink transition-colors hover:bg-sand hover:text-ink"
            >
              {t('exploreCta')} <Arrow />
            </Link>
            <OpenWhatsAppButton className="rounded-[1px] border border-ivory/45 bg-ink/25 px-[30px] py-[17px] text-[15.5px] text-ivory transition-colors hover:border-ivory hover:bg-ivory/8">
              {t('contactCta')}
            </OpenWhatsAppButton>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-5">
        <div className="container-x">
          <div className="flex items-center justify-between gap-5 border-t border-ivory/18 pt-5.5 pb-24 lg:pe-48 lg:pb-7">
            <div className="flex min-w-0 items-baseline gap-4.5" aria-live="polite">
              <span className="truncate font-display text-base text-ivory">{current.place[locale]}</span>
              <span dir="ltr" className="hidden font-latin text-[11.5px] tracking-[0.14em] text-ivory/62 md:inline">
                {current.coord}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 md:gap-4.5" dir="ltr">
              {hero.slides.map((s, i) => {
                const active = i === cur;
                return (
                  <button
                    key={s.image.src}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={s.place[locale]}
                    aria-current={active}
                    className="flex items-center gap-2.5 py-2.5 font-latin text-xs tracking-[0.1em]"
                    style={{ color: active ? '#F7F3EC' : 'rgba(247,243,236,.5)' }}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <span
                      className="relative block h-px overflow-hidden bg-ivory/30 transition-[width] duration-600"
                      style={{ width: active ? 'clamp(28px,5vw,64px)' : '12px' }}
                    >
                      {active && (
                        <span
                          key={`${cur}-${playing}`}
                          className={`absolute inset-y-0 left-0 bg-gold ${playing ? 'animate-progress' : 'w-full'}`}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? t('pause') : t('play')}
                className="ms-1 flex h-8 w-8 items-center justify-center rounded-full border border-ivory/30 text-[10px] text-ivory/80 transition-colors hover:border-gold hover:text-gold"
              >
                {playing ? '❚❚' : '▶'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
