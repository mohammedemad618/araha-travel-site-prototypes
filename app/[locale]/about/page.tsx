import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { getPage } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { ContentPage } from '@/components/ContentPage';
import { CustomTrip } from '@/components/sections/HomeSections';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = getPage('about');
  return pageMetadata({
    locale,
    path: 'about',
    title: page.title[locale],
    description: page.seoDescription[locale],
    image: page.image?.src,
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ContentPage page={getPage('about')} locale={locale}>
      <CustomTrip />
    </ContentPage>
  );
}
