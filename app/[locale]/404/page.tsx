import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getDestination, getPackages, openDepartureDates } from '@/lib/content';
import { PackageCard, toSummary } from '@/components/package/PackageCard';
import { Arrow } from '@/components/ui/Arrow';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'notFound' });
  return { title: t('title'), robots: { index: false, follow: true } };
}

/** Localized "not found" page, served by public/_redirects for unknown URLs under /ar/ and /en/. */
export default async function LocalizedNotFound({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('notFound');
  const suggestions = getPackages().slice(0, 3);
  return (
    <>
      <section className="brand-pattern bg-ink pt-[160px] pb-20 text-center text-ivory">
        <div className="container-x">
          <div
            lang="en"
            dir="ltr"
            className="mb-6 font-latin text-[11px] font-semibold tracking-[0.34em] text-gold"
          >
            404
          </div>
          <h1 className="m-0 mb-5 font-display text-[clamp(40px,6vw,80px)] leading-[1.05] rtl:leading-[1.24] font-medium">
            {t('title')}
          </h1>
          <p className="mx-auto mb-10 max-w-[520px] text-lg leading-[1.9] text-mist">{t('body')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-[1px] bg-gold px-7 py-4 text-[15px] font-medium text-ink hover:text-ink"
            >
              {t('home')}
            </Link>
            <Link
              href="/packages"
              className="rounded-[1px] border border-ivory/40 px-7 py-4 text-[15px] text-ivory hover:text-ivory"
            >
              {t('packages')} <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-ivory py-20">
        <div className="container-x">
          <h2 className="m-0 mb-10 font-display text-[clamp(26px,2.6vw,38px)] font-medium text-ink">
            {t('suggestions')}
          </h2>
          <div className="grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-3">
            {suggestions.map((p) => (
              <PackageCard
                key={p.slug}
                pkg={toSummary(p)}
                destination={getDestination(p.destination)!}
                locale={locale}
                departures={openDepartureDates(p)}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
