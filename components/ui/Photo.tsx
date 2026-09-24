import Image from 'next/image';
import type { ImageData } from '@/lib/schema';
import type { Locale } from '@/i18n/routing';

/** A cover image that fills its (relatively positioned) parent. */
export function Photo({
  image,
  locale,
  sizes,
  priority = false,
  className = '',
}: {
  image: ImageData;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={image.src}
      alt={image.alt[locale]}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
