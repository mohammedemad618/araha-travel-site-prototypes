import type { NextConfig } from 'next';

// The back office is private: no indexing, no framing, strict transport and a
// tight content security policy (everything is served from this origin).
const securityHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // React needs eval only in development (error overlays, fast refresh).
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      // Website content previews show Unsplash photos and the website's own uploads.
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This app lives in erp/ next to the website; trace files from here only.
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ['mongodb'],
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
  async headers() {
    return [
      { source: '/api/public/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/((?!api/public).*)', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
