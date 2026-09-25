'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { ImageData } from '@/lib/schema';
import { useModal } from '@/lib/useModal';

/**
 * Grid classes for each photo. Phones use 2 columns and larger screens 12; every
 * layout fills whole rows so the mosaic never leaves holes.
 */
export function layoutFor(count: number): string[] {
  const big = 'col-span-2 row-span-2 md:col-span-6';
  const small = 'col-span-1 md:col-span-3';
  const tall = 'col-span-1 row-span-2 md:col-span-3';
  const wide = 'col-span-2 md:col-span-6';
  const third = 'col-span-1 md:col-span-4';
  const full = 'col-span-2 md:col-span-12';
  switch (count) {
    case 0:
      return [];
    case 1:
      return [full + ' row-span-2'];
    case 2:
      return [wide + ' row-span-2', wide + ' row-span-2'];
    case 3:
      return [big, wide, wide];
    case 4:
      return [big, tall, small, small];
  }
  // Blocks of five (one large photo and four small, alternating sides), then a
  // closing row for whatever is left over.
  const cells: string[] = [];
  const blocks = Math.floor(count / 5);
  for (let b = 0; b < blocks; b++) {
    cells.push(...(b % 2 === 0 ? [big, small, small, small, small] : [small, small, big, small, small]));
  }
  const rest = count % 5;
  if (rest === 1) cells.push(full);
  if (rest === 2) cells.push(wide, wide);
  if (rest === 3) cells.push(third, third, 'col-span-2 md:col-span-4');
  if (rest === 4) cells.push(small, small, small, small);
  return cells;
}

export function Gallery({ images }: { images: ImageData[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('package');
  const [open, setOpen] = useState<number | null>(null);
  const cells = layoutFor(images.length);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  );
  const isOpen = open !== null;
  // Focus starts on the dialog itself so the arrow keys work straight away, and
  // stays wherever the user moved it when the photo changes.
  useModal(dialogRef, isOpen, close, '[data-autofocus]');

  useEffect(() => {
    if (!isOpen) return;
    const rtl = document.documentElement.dir === 'rtl';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
      if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, step]);

  const current = open === null ? null : images[open];

  return (
    <>
      <div className="grid auto-rows-[160px] grid-flow-dense grid-cols-2 gap-2 md:auto-rows-[220px] md:grid-cols-12 md:gap-3.5 lg:auto-rows-[270px]">
        {images.map((img, i) => (
          <button
            key={img.src + i}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`${t('viewPhotos')}: ${img.alt[locale]} (${t('photoOf', { n: i + 1, total: images.length })})`}
            className={`group relative overflow-hidden rounded-[2px] bg-slate ${cells[i]}`}
          >
            <Image
              src={img.src}
              alt=""
              fill
              sizes={
                cells[i]!.includes('md:col-span-6') || cells[i]!.includes('md:col-span-12')
                  ? '(min-width: 760px) 50vw, 100vw'
                  : '(min-width: 760px) 25vw, 50vw'
              }
              className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.04]"
            />
          </button>
        ))}
      </div>

      {current && open !== null && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('gallery')}
          tabIndex={-1}
          className="fixed inset-0 z-100 flex flex-col bg-ink text-ivory outline-none"
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
            const rtl = document.documentElement.dir === 'rtl';
            if (Math.abs(dx) > 50) step(dx < 0 !== rtl ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-latin text-sm text-mist" aria-live="polite">
              {t('photoOf', { n: open + 1, total: images.length })}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={t('closeGallery')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/30"
            >
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          <div className="relative mx-auto w-full max-w-[1200px] flex-1">
            <Image
              src={current.src}
              alt={current.alt[locale]}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={t('prevPhoto')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-ivory/30"
            >
              <ChevronLeft size={22} strokeWidth={1.5} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <p className="m-0 max-w-[640px] text-center text-[14px] text-mist">
              {current.alt[locale]}
              {current.credit && (
                <span lang="en" className="block text-[12px] text-fog">
                  © {current.credit}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={t('nextPhoto')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-ivory/30"
            >
              <ChevronRight size={22} strokeWidth={1.5} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
