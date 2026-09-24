import { Alexandria, IBM_Plex_Sans_Arabic, Manrope } from 'next/font/google';

export const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-alexandria',
  display: 'swap',
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
  // Only the headline font is preloaded; body text renders in the fallback until this arrives.
  preload: false,
});

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
  preload: false,
});
