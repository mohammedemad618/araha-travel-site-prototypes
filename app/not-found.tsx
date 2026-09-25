import Link from 'next/link';
import type { Metadata } from 'next';
import { alexandria, manrope, plexArabic } from './fonts';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة · Page not found | أريحا Ariha',
};

/**
 * Exported as 404.html. It sits outside the [locale] layout, so it renders its
 * own <html> and offers both languages.
 */
export default function NotFound() {
  const cta =
    'inline-flex items-center gap-3 rounded-[1px] px-7 py-4 text-[15px] font-medium transition-colors';
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} ${plexArabic.variable} ${manrope.variable}`}>
      <body className="bg-ink">
        <main className="flex min-h-svh items-center justify-center px-6 py-24 text-center text-ivory">
          <div className="max-w-[720px]">
            <div className="mb-10 flex items-center justify-center gap-3">
              <span className="h-[9px] w-[9px] rotate-45 bg-gold" aria-hidden="true" />
              <span className="font-display text-3xl font-medium">أريحا</span>
            </div>
            <div dir="ltr" className="mb-6 font-latin text-[11px] font-semibold tracking-[0.34em] text-gold">
              404 · PAGE NOT FOUND
            </div>
            <h1 className="m-0 mb-5 font-display text-[clamp(40px,6vw,80px)] leading-[1.05] rtl:leading-[1.24] font-medium">
              هذه الصفحة غير موجودة
            </h1>
            <p className="mx-auto mb-3 max-w-[480px] text-lg leading-[1.9] font-light text-mist">
              ربما تغيّر الرابط أو انتهى العرض. لكن رحلتك القادمة ما زالت بانتظارك.
            </p>
            <p
              dir="ltr"
              lang="en"
              className="mx-auto mb-10 max-w-[480px] font-latin text-base leading-[1.8] text-fog"
            >
              This page doesn’t exist. The link may have changed or the offer may have ended.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ar/" className={`${cta} bg-gold text-ink hover:bg-sand`}>
                العودة إلى الرئيسية
              </Link>
              <Link
                href="/en/"
                lang="en"
                className={`${cta} border border-ivory/40 font-latin text-ivory hover:border-ivory`}
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
