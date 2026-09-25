import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import {
  getDestinations,
  getHome,
  getPackage,
  getPackages,
  getSite,
  getVerifiedTestimonials,
  offerIsActive,
  upcomingDepartures,
} from '@/lib/content';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { Hero } from '@/components/sections/Hero';
import {
  CustomTrip,
  DestinationsGrid,
  FeaturedPackages,
  FinalCta,
  IntroLoader,
  SeasonalOffer,
  Services,
  Stories,
  TravelStyles,
  TrustBar,
  WhyUs,
} from '@/components/sections/HomeSections';
import { toSummary } from '@/components/package/PackageCard';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const site = getSite();
  return pageMetadata({
    locale,
    path: '',
    title: t('metaTitle'),
    description: site.description[locale],
    image: getHome().hero.slides[0]?.image.src,
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const home = getHome();
  const site = getSite();
  const destinations = getDestinations();
  const destMap = new Map(destinations.map((d) => [d.slug, d]));
  const packages = getPackages();

  // getHome() guarantees both references exist.
  const featured = getPackage(home.featuredPackage)!;
  const offerPkg = getPackage(home.offer.package)!;
  const showOffer = offerIsActive(home.offer.validUntil);
  const others = packages
    .filter((p) => p.slug !== featured.slug && (!showOffer || p.slug !== offerPkg.slug))
    .slice(0, 5);
  const nextDepartures = Object.fromEntries(
    packages.map((p) => {
      const next = upcomingDepartures(p).find((d) => d.status !== 'soldout');
      return [p.slug, next ? formatDate(next.date, locale) : undefined];
    }),
  );

  return (
    <>
      <IntroLoader />
      <Hero hero={home.hero} />
      <TrustBar points={home.trustPoints} site={site} locale={locale} />
      <FeaturedPackages
        featured={featured}
        others={others.map(toSummary)}
        destinations={destMap}
        nextDepartures={nextDepartures}
        locale={locale}
      />
      {showOffer && <SeasonalOffer offer={home.offer} pkg={offerPkg} locale={locale} />}
      <DestinationsGrid destinations={destinations} locale={locale} />
      <TravelStyles styles={home.styles} locale={locale} />
      <Services services={home.services} locale={locale} />
      <CustomTrip phone={site.phone} />
      <WhyUs benefits={home.benefits} locale={locale} />
      <Stories
        stories={getVerifiedTestimonials()}
        destinations={destMap}
        locale={locale}
        reviewsUrl={site.trust.googleMapsUrl}
      />
      <FinalCta image={home.finalImage} locale={locale} phone={site.phone} />
    </>
  );
}
