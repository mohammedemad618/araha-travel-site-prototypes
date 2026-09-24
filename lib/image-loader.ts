import type { ImageLoaderProps } from 'next/image';

// Unsplash images are resized by Unsplash's own CDN (auto=format serves AVIF/WebP).
// Images uploaded through the CMS live under /uploads and are resized by the
// Netlify Image CDN when the site is built on Netlify.
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 70;
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(q));
    return url.toString();
  }
  if (src.startsWith('/') && process.env.NEXT_PUBLIC_IMAGE_CDN === 'netlify') {
    return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
  }
  return src;
}
