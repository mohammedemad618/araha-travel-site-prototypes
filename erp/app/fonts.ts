import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';

export const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
