'use client';

import { useLivePackage } from '@/lib/live-catalog';
import { Price } from '../ui/Price';

/** A package price that switches to the ERP's current price once it loads. */
export function LivePrice({
  slug,
  value,
  className,
  unitClassName,
}: {
  slug: string;
  value: number;
  className?: string;
  unitClassName?: string;
}) {
  const live = useLivePackage(slug);
  return <Price value={live?.price ?? value} className={className} unitClassName={unitClassName} />;
}
