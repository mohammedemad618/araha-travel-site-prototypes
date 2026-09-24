import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { getDestination, getDestinations, getPackages } from '@/lib/content';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Photo } from '@/components/ui/Photo';
import { JsonLd } from '@/components/JsonLd';
import { PackageCard } from '@/components/package/PackageCard';
import { CustomTrip } from '@/components/sections/HomeSections';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getDestinations().map((d) => ({ locale, slug: d.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = getDestination(slug);
  if (!d) return {};
  return pageMetadata({
    locale,
    path: `destinations/${slug}`,
    title: d.name[locale],
    description: d.description[locale],
    image: d.image.src,
  });
}

export default async function DestinationPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = getDestination(slug);
  if (!d) notFound();
  const t = await getTranslations('destinations');
  const tn = await getTranslations('nav');
  const packages = getPackages().filter((p) => p.destination === d.slug);
  const others = getDestinations().filter((x) => x.slug !== d.slug);

  return (
    <>
      <PageHero
        locale={locale}
        image={d.image}
        eyebrow={`${d.label} · ${d.coord}`}
        title={d.name[locale]}
        intro={d.tagline[locale]}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('destinations'), href: '/destinations' }, { label: d.name[locale] }]}
      />
      <section className="bg-ivory py-[clamp(72px,9vw,128px)]">
        <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <p data-reveal className="m-0 font-display text-[clamp(20px,1.8vw,26px)] leading-[1.8] font-light text-pretty text-ink-2">
            {d.description[locale]}
          </p>
          <div className="self-start border-t border-ink pt-6">
            <div className="mb-2 text-[13px] text-muted">{t('bestSeason')}</div>
            <div className="font-display text-2xl font-medium text-ink">{d.bestSeason[locale]}</div>
          </div>
        </div>
      </section>
      <section className="bg-ivory pb-[clamp(96px,11vw,168px)]">
        <div className="container-x">
          <div className="mb-[clamp(36px,4vw,56px)] h-px bg-ink/12" />
          <Eyebrow className="mb-5.5">PACKAGES</Eyebrow>
          <h2 className="heading-xl m-0 mb-12 text-ink">{t('packagesIn', { name: d.name[locale] })}</h2>
          {packages.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-[clamp(20px,2vw,32px)] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((p) => (
                <PackageCard key={p.slug} pkg={p} destination={d} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="m-0 max-w-[560px] text-[17px] leading-[1.85] text-muted">{t('noPackages')}</p>
          )}
        </div>
      </section>
      <CustomTrip />
      <section className="bg-ink py-[clamp(88px,10vw,144px)] text-ivory">
        <div className="container-x">
          <h2 className="m-0 mb-10 font-display text-[clamp(30px,3.6vw,52px)] font-medium">{t('other')}</h2>
          <div className="no-scrollbar grid snap-x auto-cols-[72%] grid-flow-col gap-3 overflow-x-auto md:auto-cols-auto md:grid-flow-row md:grid-cols-5 md:overflow-visible">
            {others.map((o) => (
              <Link key={o.slug} href={`/destinations/${o.slug}`} className="group relative block aspect-[3/4] snap-start overflow-hidden rounded-[2px] bg-slate text-ivory hover:text-ivory">
                <span className="absolute inset-0 transition-transform duration-[1400ms] ease-soft group-hover:scale-[1.06]">
                  <Photo image={o.image} locale={locale} sizes="(min-width: 760px) 20vw, 72vw" />
                </span>
                <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/90 via-ink/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5">
                  <span dir="ltr" className="mb-2 block font-latin text-[10px] tracking-[0.24em] text-gold">{o.label}</span>
                  <span className="font-display text-2xl font-medium">{o.name[locale]}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TouristDestination',
          name: d.name[locale],
          description: d.description[locale],
          url: absoluteUrl(localizedPath(locale, `destinations/${d.slug}`)),
          image: d.image.src,
        }}
      />
    </>
  );
}
