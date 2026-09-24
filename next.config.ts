import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Fully static site: every page is pre-rendered to HTML at build time and
  // served from Netlify's CDN. Forms are handled by Netlify Forms.
  output: 'export',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_IMAGE_CDN: process.env.NETLIFY ? 'netlify' : '',
  },
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
};

export default withNextIntl(nextConfig);
