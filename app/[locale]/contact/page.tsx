import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getSite } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { ContactForm } from '@/components/forms/Forms';
import { WhatsAppLink } from '@/components/WhatsApp';
import { Arrow } from '@/components/ui/Arrow';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return pageMetadata({ locale, path: 'contact', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('contact');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');
  const tw = await getTranslations('whatsapp');
  const site = getSite();
  const label = 'mb-2 block font-latin text-[10.5px] tracking-[0.28em] text-bronze uppercase';

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('contact') }]}
      />
      <section className="bg-ivory py-[clamp(72px,9vw,128px)]">
        <div className="container-x grid items-start gap-[clamp(48px,7vw,120px)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-10">
            <div className="border-t border-ink pt-6">
              <span dir="ltr" className={label}>WHATSAPP</span>
              <WhatsAppLink
                text={tw('planTrip')}
                source="contact-page"
                className="flex items-center justify-between gap-4 font-display text-[clamp(24px,2.4vw,34px)] font-medium text-ink hover:text-bronze"
              >
                <span dir="ltr">{site.whatsappDisplay}</span>
                <Arrow className="text-gold" />
              </WhatsAppLink>
            </div>
            <div className="border-t border-ink/20 pt-6">
              <span dir="ltr" className={label}>{tc('phone')}</span>
              <a href={`tel:${site.phone}`} dir="ltr" className="font-display text-[clamp(22px,2vw,28px)] text-ink hover:text-bronze">
                {site.phoneDisplay}
              </a>
            </div>
            <div className="border-t border-ink/20 pt-6">
              <span dir="ltr" className={label}>{tc('email')}</span>
              <a href={`mailto:${site.email}`} className="font-latin text-xl text-ink hover:text-bronze">
                {site.email}
              </a>
            </div>
            <div className="border-t border-ink/20 pt-6">
              <span className={label}>{t('office')}</span>
              <address className="text-[17px] leading-[1.8] text-ink-2 not-italic">{site.address[locale]}</address>
              <p className="m-0 mt-3 text-[15px] text-muted">
                {t('hours')}: {site.hours[locale]}
              </p>
            </div>
          </div>
          <div className="rounded-[2px] bg-sand p-[clamp(28px,4vw,56px)]">
            <h2 className="m-0 mb-8 font-display text-[clamp(28px,2.6vw,38px)] font-medium text-ink">{t('formTitle')}</h2>
            <ContactForm />
          </div>
        </div>
      </section>
      <section aria-label={t('map')} className="bg-ivory pb-[clamp(96px,11vw,160px)]">
        <div className="container-x">
          <iframe
            title={t('map')}
            src={`https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed&hl=${locale}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[420px] w-full rounded-[2px] border-0 grayscale-[0.4]"
          />
        </div>
      </section>
    </>
  );
}
