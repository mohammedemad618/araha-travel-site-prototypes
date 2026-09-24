import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'أريحا للسياحة والسفر · Ariha Travel & Tourism',
  robots: { index: false, follow: true },
  alternates: { canonical: '/ar/' },
};

/**
 * On Netlify, "/" is redirected to /ar/ or /en/ by public/_redirects (based on
 * the browser language). This page is only a fallback for other hosts.
 */
export default function RootPage() {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta httpEquiv="refresh" content="0; url=/ar/" />
      </head>
      <body>
        <p>
          <Link href="/ar/">أريحا للسياحة والسفر</Link> · <Link href="/en/">Ariha Travel &amp; Tourism</Link>
        </p>
      </body>
    </html>
  );
}
