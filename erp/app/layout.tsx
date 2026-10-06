import type { Metadata, Viewport } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/client';
import { plex, inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Niura ERP', template: '%s · Niura ERP' },
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#0b1d26', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, dir, dict } = await getI18n();
  return (
    <html lang={lang} dir={dir} className={`${plex.variable} ${inter.variable}`}>
      <body>
        <I18nProvider lang={lang} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
