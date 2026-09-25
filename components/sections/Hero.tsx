'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Pause, Play } from 'lucide-react';
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
  // Pauses while keyboard focus is inside the carousel or the tab is hidden (the hero is full-screen,
  // so pausing on hover would stop it almost permanently). The pause button covers WCAG 2.2.2.
  const [held, setHeld] = useState(false);
  // Only the first slide is loaded up front; the rest after the page is idle.
  const [warm, setWarm] = useState(false);
  const count = hero.slides.length;
  const running = playing && !held && count > 1;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const onLoad = () => idle(() => setWarm(true));
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    const onVisibility = () => setHeld(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('load', onLoad);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!running || !warm) return;
    const id = window.setTimeout(() => setCur((c) => (c + 1) % count), INTERVAL);
    return () => window.clearTimeout(id);
  }, [running, warm, cur, count]);

  const current = hero.slides[cur] ?? hero.slides[0]!;
  const eyebrowShadow = { textShadow: '0 1px 12px rgba(0,0,0,.55)' };

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label={t('sliderLabel')}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-ink text-ivory"
    >
      {hero.slides.map((s, i) => {
        const active = i === cur;
        return (
          <div
            key={s.image.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={!active}
            className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out"
            style={{ opacity: active ? 1 : 0, zIndex: active ? 2 : 1 }}
          >
            <div data-parallax="0.18" className="absolute inset-x-0 -top-[10%] -bottom-[10%]">
              <div
                className="absolute inset-0 bg-slate"
                style={{
                  transform: active && warm ? 'scale(1.08)' : 'scale(1)',
                  transition: active ? 'transform 9s linear' : 'transform 0s linear 1.8s',
                }}
              >
                {(i === 0 || warm) && (
                  <Image
                    src={s.image.src}
                    alt={s.image.alt[locale]}
                    fill
                    sizes="100vw"
                    priority={i === 0}
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    className="object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Bottom-up darkening plus a start-side scrim keep the copy legible on bright photos. */}
      <div
        className="pointer-events-none absolute inset-0 z-3"
        style={{
          background:
            'linear-gradient(to top,rgba(11,29,38,.94) 0%,rgba(11,29,38,.5) 42%,rgba(11,29,38,.25) 70%,rgba(11,29,38,.6) 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-3 bg-[linear-gradient(90deg,rgba(11,29,38,.55),transparent_65%)] rtl:bg-[linear-gradient(270deg,rgba(11,29,38,.55),transparent_65%)]" />

      <div className="pointer-events-none relative z-4 flex flex-col justify-end pt-[120px] pb-[196px] lg:pb-[clamp(120px,17vh,190px)]">
        <div className="container-x">
          <div className="mb-7 flex items-center gap-3.5">
            <span className="h-px w-10 shrink-0 bg-gold" aria-hidden="true" />
            <span
              lang="en"
              dir="ltr"
              style={eyebrowShadow}
              className="font-latin text-[11px] font-semibold tracking-[0.2em] text-sand md:tracking-[0.32em]"
            >
              {hero.eyebrow}
            </span>
          </div>
          <h1
            className={`m-0 mb-7 font-display leading-[1.04] rtl:leading-[1.24] font-medium tracking-[-0.015em] text-balance ${
              locale === 'ar'
                ? 'max-w-[11ch] text-[clamp(52px,8.6vw,138px)]'
                : 'max-w-[13ch] text-[clamp(44px,7.4vw,120px)]'
            }`}
          >
            <span className="block">{hero.headline[0][locale]}</span>
            <span className="block font-light text-sand">{hero.headline[1][locale]}</span>
          </h1>
          <p className="m-0 mb-10 max-w-[520px] text-[clamp(16px,1.35vw,19px)] leading-[1.85] text-ivory/90">
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
          <div className="flex items-center justify-between gap-5 border-t border-ivory/18 pt-5.5 pb-24 md:pb-7 md:pe-48">
            <div className="flex min-w-0 items-baseline gap-4.5" aria-live={running ? 'off' : 'polite'}>
              <span className="truncate font-display text-base text-ivory">{current.place[locale]}</span>
              <span
                lang="en"
                dir="ltr"
                className="hidden font-latin text-[11.5px] tracking-[0.14em] text-ivory/70 md:inline"
              >
                {current.coord}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 md:gap-4.5" dir="ltr">
              {hero.slides.map((s, i) => {
                const active = i === cur;
                const num = String(i + 1).padStart(2, '0');
                return (
                  <button
                    key={s.image.src}
                    type="button"
                    onClick={() => setCur(i)}
                    aria-label={`${num} ${s.place[locale]}`}
                    aria-current={active}
                    className="flex min-h-11 items-center gap-2.5 font-latin text-xs tracking-[0.1em]"
                    style={{ color: active ? '#F7F3EC' : 'rgba(247,243,236,.6)' }}
                  >
                    <span>{num}</span>
                    <span
                      className="relative block h-px overflow-hidden bg-ivory/30 transition-[width] duration-600"
                      style={{ width: active ? 'clamp(28px,5vw,64px)' : '12px' }}
                    >
                      {active && (
                        <span
                          key={`${cur}-${running}-${warm}`}
                          className={`absolute inset-y-0 left-0 bg-gold ${running && warm ? 'animate-progress' : 'w-full'}`}
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
                className="ms-1 flex h-9 w-9 items-center justify-center rounded-full border border-ivory/30 text-ivory/85 transition-colors hover:border-gold hover:text-gold"
              >
                {playing ? (
                  <Pause size={14} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Play size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
