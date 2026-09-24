import { useLocale } from 'next-intl';

/** A reading-direction aware arrow: "forward" points left in Arabic, right in English. */
export function Arrow({ back = false, className }: { back?: boolean; className?: string }) {
  const rtl = useLocale() === 'ar';
  const forward = rtl ? '←' : '→';
  const backward = rtl ? '→' : '←';
  return (
    <span aria-hidden="true" className={className}>
      {back ? backward : forward}
    </span>
  );
}
