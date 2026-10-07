'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { buttonClass } from '@/components/ui';
import { uploadMedia } from '@/lib/actions/site-content';
import { useI18n } from '@/lib/i18n/client';

/** Uploads one or more images to the library. */
export function MediaUpload() {
  const { t } = useI18n();
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={ref}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label={t('website.uploadImage')}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          setError(null);
          start(async () => {
            for (const f of files) {
              const fd = new FormData();
              fd.set('file', f);
              const res = await uploadMedia(null, fd);
              if (!res.ok) setError(`${f.name}: ${t(`errors.${res.error}`)}`);
            }
            router.refresh();
          });
        }}
      />
      <button
        type="button"
        className={buttonClass('primary')}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => ref.current?.click()}
      >
        <Upload size={16} aria-hidden="true" />
        {pending ? t('website.uploading') : t('website.uploadImages')}
      </button>
      <span className="text-[12.5px] text-faint">{t('website.uploadHint')}</span>
      {error && (
        <p role="alert" className="m-0 w-full text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
