'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';
import { buttonClass } from '@/components/ui';
import { useI18n } from '@/lib/i18n/client';
import { uploadMedia } from '@/lib/actions/site-content';

export type MediaItem = { id: string; name: string };

/** A browser URL for an image source: library image, website upload or Unsplash photo. */
export function imagePreviewUrl(src: string, siteUrl?: string): string | null {
  if (src.startsWith('media:')) return `/api/public/media/${src.slice(6)}`;
  if (src.startsWith('https://images.unsplash.com/')) {
    const u = new URL(src);
    u.searchParams.set('w', '480');
    u.searchParams.set('auto', 'format');
    return u.toString();
  }
  if (src.startsWith('/uploads/') && siteUrl) return `${siteUrl.replace(/\/+$/, '')}${src}`;
  return null;
}

/** Choose an image from the company's library, or upload a new one. */
export function MediaPicker({
  media,
  onPick,
  onClose,
}: {
  media: MediaItem[];
  onPick: (src: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const upload = (file: File) => {
    setError(null);
    const fd = new FormData();
    fd.set('file', file);
    start(async () => {
      const res = await uploadMedia(null, fd);
      if (res.ok && typeof res.data?.src === 'string') {
        router.refresh();
        onPick(res.data.src);
      } else if (!res.ok) setError(t(`errors.${res.error}`));
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('website.library')}
        tabIndex={-1}
        className="card flex max-h-[85vh] w-full max-w-3xl flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="m-0 text-[15px] font-semibold">{t('website.library')}</h2>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-ink/6"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={t('website.uploadImage')}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className={buttonClass('primary', 'sm')}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} aria-hidden="true" />
            {pending ? t('website.uploading') : t('website.uploadImage')}
          </button>
          <span className="text-[12.5px] text-faint">{t('website.uploadHint')}</span>
          {error && (
            <p role="alert" className="m-0 w-full text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="overflow-y-auto p-5">
          {media.length === 0 ? (
            <p className="m-0 text-[13.5px] text-muted">{t('website.libraryEmpty')}</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
              {media.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onPick(`media:${m.id}`)}
                    className="group block w-full overflow-hidden rounded-lg border border-line text-start hover:border-ink"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/public/media/${m.id}`}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1.5 text-[12px] text-muted" dir="ltr">
                      {m.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
