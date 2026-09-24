import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getDestinations, getHome, getPackage, getPackages, getSite, getTestimonials } from '@/lib/content';
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
  WhyUs,
} from '@/components/sections/HomeSections';

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

  const featured = getPackage(home.featuredPackage) ?? packages[0]!;
  const offerPkg = getPackage(home.offer.package) ?? featured;
  const others = packages.filter((p) => p.slug !== featured.slug && p.slug !== offerPkg.slug).slice(0, 5);

  return (
    <>
      <IntroLoader />
      <Hero hero={home.hero} />
      <TravelStyles styles={home.styles} locale={locale} />
      <FeaturedPackages featured={featured} others={others} destinations={destMap} locale={locale} />
      <DestinationsGrid destinations={destinations} locale={locale} />
      <Services services={home.services} locale={locale} />
      <CustomTrip />
      <SeasonalOffer offer={home.offer} pkg={offerPkg} locale={locale} />
      <WhyUs benefits={home.benefits} locale={locale} />
      <Stories stories={getTestimonials()} destinations={destMap} locale={locale} />
      <FinalCta image={home.finalImage} locale={locale} phone={site.phone} />
    </>
  );
}
