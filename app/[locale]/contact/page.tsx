import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getSite } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { PageHero } from '@/components/PageHero';
import { CallbackForm, ContactForm } from '@/components/forms/Forms';
import { WhatsAppLink } from '@/components/WhatsApp';
import { Arrow } from '@/components/ui/Arrow';
import { En } from '@/components/ui/En';
import { WhatsAppGlyph } from '@/components/ui/Icon';
import { MapEmbed } from '@/components/MapEmbed';

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
  const label = 'mb-2 flex items-center gap-2 text-[14px] font-medium text-bronze';

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t('eyebrow')}
        title={t('title')}
        intro={t('intro')}
        crumbs={[{ label: tn('home'), href: '/' }, { label: tn('contact') }]}
      />
      <section className="bg-ivory py-[clamp(64px,8vw,120px)]">
        <div className="container-x grid items-start gap-[clamp(48px,7vw,120px)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-9">
            <div className="border-t border-ink pt-6">
              <span className={label}>
                <WhatsAppGlyph size={16} /> {tc('whatsapp')}
              </span>
              <WhatsAppLink
                text={tw('planTrip')}
                source="contact-page"
                className="flex items-center justify-between gap-4 font-display text-[clamp(24px,2.4vw,34px)] font-medium text-ink hover:text-bronze"
              >
                <En>{site.whatsappDisplay}</En>
                <Arrow className="text-gold" />
              </WhatsAppLink>
            </div>
            <div className="border-t border-ink/20 pt-6">
              <span className={label}>
                <Phone size={16} strokeWidth={1.5} aria-hidden="true" /> {tc('phone')}
              </span>
              <a
                href={`tel:${site.phone}`}
                className="font-display text-[clamp(22px,2vw,28px)] text-ink hover:text-bronze"
              >
                <En>{site.phoneDisplay}</En>
              </a>
            </div>
            <div className="border-t border-ink/20 pt-6">
              <span className={label}>
                <Mail size={16} strokeWidth={1.5} aria-hidden="true" /> {tc('email')}
              </span>
              <a href={`mailto:${site.email}`} className="font-latin text-xl text-ink hover:text-bronze">
                <En>{site.email}</En>
              </a>
            </div>
            <div className="border-t border-ink/20 pt-6">
              <span className={label}>
                <MapPin size={16} strokeWidth={1.5} aria-hidden="true" /> {t('office')}
              </span>
              <address className="text-[17px] leading-[1.8] text-ink-2 not-italic">
                {site.address[locale]}
              </address>
              <p className="m-0 mt-3 text-[15px] text-muted">
                {t('hours')}: {site.hours[locale]}
              </p>
            </div>
            <div id="callback" className="scroll-mt-28 rounded-[2px] bg-ink p-7 text-ivory">
              <h2 className="m-0 mb-2 font-display text-[24px] font-medium">{t('callbackTitle')}</h2>
              <p className="m-0 mb-4 text-[14.5px] leading-[1.8] text-mist">{t('callbackIntro')}</p>
              <CallbackForm dark />
            </div>
          </div>
          <div className="rounded-[2px] bg-sand p-[clamp(28px,4vw,56px)]">
            <h2 className="m-0 mb-8 font-display text-[clamp(28px,2.6vw,38px)] font-medium text-ink">
              {t('formTitle')}
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>
      <section aria-label={t('map')} className="bg-ivory pb-[clamp(96px,11vw,160px)]">
        <div className="container-x">
          <MapEmbed
            query={site.mapQuery}
            locale={locale}
            title={t('map')}
            loadLabel={t('loadMap')}
            openLabel={t('openMaps')}
          />
        </div>
      </section>
    </>
  );
}
