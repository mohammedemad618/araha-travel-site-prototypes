import { Mail, MapPin, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getSite } from '@/lib/content';
import { whatsappLink } from '@/lib/format';
import { Wordmark } from './ui/Wordmark';
import { En } from './ui/En';
import { FacebookGlyph, InstagramGlyph, TikTokGlyph, WhatsAppGlyph } from './ui/Icon';

const SOCIAL = {
  instagram: { label: 'Instagram', Glyph: InstagramGlyph },
  facebook: { label: 'Facebook', Glyph: FacebookGlyph },
  tiktok: { label: 'TikTok', Glyph: TikTokGlyph },
} as const;

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');
  const tw = await getTranslations('whatsapp');
  const site = getSite();
  const social = (Object.keys(SOCIAL) as (keyof typeof SOCIAL)[]).filter((k) => site.social[k]);
  const col = 'flex flex-col gap-3.5 text-[15px]';
  const colTitle = 'mb-1.5 text-[13px] font-medium text-gold';
  const linkCls = 'text-mist transition-colors hover:text-gold';

  return (
    <footer className="bg-ink pt-[clamp(80px,9vw,128px)] pb-[112px] text-ivory md:pb-12">
      <div className="container-x">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-end gap-12 border-b border-ivory/12 pb-[clamp(56px,6vw,88px)]">
          <p className="m-0 font-display text-[clamp(34px,4.4vw,64px)] leading-[1.2] font-normal tracking-[-0.01em]">
            {t('lineA')}
            <br />
            <span className="text-gold">{t('lineB')}</span>
          </p>
          <div className="flex flex-col items-start gap-5">
            <Wordmark size="lg" />
            {social.length > 0 && (
              <div className="flex gap-3">
                {social.map((k) => {
                  const { label, Glyph } = SOCIAL[k];
                  return (
                    <a
                      key={k}
                      href={site.social[k]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/20 text-ivory transition-colors hover:border-gold hover:text-gold"
                    >
                      <Glyph size={18} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-8 gap-y-11 py-[clamp(48px,5vw,72px)]">
          <div className={col}>
            <span className={colTitle}>{t('explore')}</span>
            <Link href="/packages" className={linkCls}>
              {tn('packages')}
            </Link>
            <Link href="/destinations" className={linkCls}>
              {tn('destinations')}
            </Link>
            <Link href="/visa" className={linkCls}>
              {tn('visa')}
            </Link>
            <Link href="/guides" className={linkCls}>
              {tn('guides')}
            </Link>
            <Link href="/#services" className={linkCls}>
              {tn('services')}
            </Link>
            <Link href="/faq" className={linkCls}>
              {tn('faq')}
            </Link>
          </div>
          <div className={col}>
            <span className={colTitle}>{t('contact')}</span>
            <a href={`tel:${site.phone}`} className={`${linkCls} flex items-center gap-2.5`}>
              <Phone size={16} strokeWidth={1.5} className="shrink-0 text-gold" aria-hidden="true" />
              <span className="sr-only">{tc('phone')}</span>
              <En className="font-latin">{site.phoneDisplay}</En>
            </a>
            <a
              href={whatsappLink(site.whatsapp, tw('planTrip'))}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkCls} flex items-center gap-2.5`}
            >
              <WhatsAppGlyph size={16} className="shrink-0 text-gold" />
              <span className="sr-only">{tc('whatsapp')}</span>
              <En className="font-latin">{site.whatsappDisplay}</En>
            </a>
            <a href={`mailto:${site.email}`} className={`${linkCls} flex items-center gap-2.5`}>
              <Mail size={16} strokeWidth={1.5} className="shrink-0 text-gold" aria-hidden="true" />
              <span className="sr-only">{tc('email')}</span>
              <En className="font-latin">{site.email}</En>
            </a>
          </div>
          <div className={col}>
            <span className={colTitle}>{t('office')}</span>
            <address className="flex gap-2.5 leading-[1.8] text-mist not-italic">
              <MapPin size={16} strokeWidth={1.5} className="mt-1.5 shrink-0 text-gold" aria-hidden="true" />
              {site.address[locale]}
            </address>
            <span className="text-sm text-fog">{site.hours[locale]}</span>
            {site.license && (
              <span className="text-sm text-fog">
                {t('license')} {site.license[locale]}
              </span>
            )}
          </div>
          <div className={col}>
            <span className={colTitle}>{t('company')}</span>
            <Link href="/about" className={linkCls}>
              {tn('about')}
            </Link>
            <Link href="/contact" className={linkCls}>
              {tn('contact')}
            </Link>
            <Link href="/privacy" className={linkCls}>
              {t('privacy')}
            </Link>
            <Link href="/terms" className={linkCls}>
              {t('terms')}
            </Link>
          </div>
        </div>

        {site.paymentMethods.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ivory/12 py-6 text-[13.5px] text-fog">
            <span className="text-gold">{t('payments')}</span>
            {site.paymentMethods.map((m) => (
              <span key={m.en} className="rounded-[1px] border border-ivory/15 px-3 py-1">
                {m[locale]}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ivory/12 pt-7 text-[13px] text-ash">
          <span>{t('rights', { year: new Date().getFullYear(), name: site.name[locale] })}</span>
          <Link href="/about#credits" className="text-ash hover:text-gold">
            {t('credits')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
