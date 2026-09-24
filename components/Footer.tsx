import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getDestinations, getHome, getPackages, getSite, getTestimonials, photoCredits } from '@/lib/content';
import { whatsappLink } from '@/lib/format';
import { Wordmark } from './ui/Wordmark';

function allCredits() {
  const home = getHome();
  return photoCredits([
    ...home.hero.slides.map((s) => s.image),
    ...home.styles.map((s) => s.image),
    home.offer.image,
    home.finalImage,
    ...getPackages().flatMap((p) => [p.image, ...p.gallery]),
    ...getDestinations().map((d) => d.image),
    ...getTestimonials().map((s) => s.image),
  ]);
}

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');
  const tw = await getTranslations('whatsapp');
  const site = getSite();
  const social = Object.entries(site.social).filter(([, url]) => Boolean(url)) as [string, string][];
  const credits = allCredits();
  const col = 'flex flex-col gap-3.5 text-[15px]';
  const colTitle = 'mb-1.5 font-latin text-[10.5px] tracking-[0.28em] text-gold';
  const linkCls = 'text-mist transition-colors hover:text-gold';

  return (
    <footer className="bg-ink pt-[clamp(80px,9vw,128px)] pb-[120px] text-ivory lg:pb-12">
      <div className="container-x">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-end gap-12 border-b border-ivory/12 pb-[clamp(56px,6vw,88px)]">
          <p className="m-0 font-display text-[clamp(34px,4.4vw,64px)] leading-[1.2] font-normal tracking-[-0.01em]">
            {t('lineA')}
            <br />
            <span className="text-gold">{t('lineB')}</span>
          </p>
          <div className="flex flex-col items-start gap-1.5">
            <Wordmark size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-8 gap-y-11 py-[clamp(48px,5vw,72px)]">
          <div className={col}>
            <span dir="ltr" className={`${colTitle} text-start`}>
              {t('explore')}
            </span>
            <Link href="/packages" className={linkCls}>{tn('packages')}</Link>
            <Link href="/destinations" className={linkCls}>{tn('destinations')}</Link>
            <Link href="/#services" className={linkCls}>{tn('services')}</Link>
            <Link href="/about" className={linkCls}>{tn('about')}</Link>
            <Link href="/faq" className={linkCls}>{tn('faq')}</Link>
            <Link href="/contact" className={linkCls}>{tn('contact')}</Link>
          </div>
          <div className={col}>
            <span dir="ltr" className={colTitle}>{t('contact')}</span>
            <a href={`tel:${site.phone}`} className={`${linkCls} flex gap-2.5`}>
              <span>{tc('phone')}</span>
              <span dir="ltr" className="font-latin">{site.phoneDisplay}</span>
            </a>
            <a href={whatsappLink(site.whatsapp, tw('planTrip'))} target="_blank" rel="noopener noreferrer" className={`${linkCls} flex gap-2.5`}>
              <span>{tc('whatsapp')}</span>
              <span dir="ltr" className="font-latin">{site.whatsappDisplay}</span>
            </a>
            <a href={`mailto:${site.email}`} className={`${linkCls} font-latin`}>{site.email}</a>
          </div>
          <div className={col}>
            <span dir="ltr" className={colTitle}>{t('office')}</span>
            <address className="leading-[1.8] text-mist not-italic">{site.address[locale]}</address>
            <span className="text-sm text-fog">{site.hours[locale]}</span>
            {site.license && (
              <span className="text-sm text-fog">
                {t('license')} {site.license[locale]}
              </span>
            )}
          </div>
          {social.length > 0 && (
            <div className={col}>
              <span dir="ltr" className={colTitle}>{t('follow')}</span>
              {social.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" dir="ltr" className={`${linkCls} font-latin capitalize text-start`}>
                  {name === 'tiktok' ? 'TikTok' : name}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-4 border-t border-ivory/12 pt-7 text-[13px] text-ash">
          <span>{t('rights', { year: new Date().getFullYear(), name: site.name[locale] })}</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-ash hover:text-gold">{t('privacy')}</Link>
            <Link href="/terms" className="text-ash hover:text-gold">{t('terms')}</Link>
          </div>
          {credits.length > 0 && (
            <span className="order-3 w-full text-[11.5px] leading-[1.7]">
              {tc('photoCredits', { names: credits.join(', ') })}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
