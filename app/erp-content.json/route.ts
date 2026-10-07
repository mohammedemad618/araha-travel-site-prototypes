import {
  getDestinations,
  getFaqs,
  getGuides,
  getHome,
  getPackages,
  getPage,
  getSite,
  getTestimonials,
  getVisas,
} from '@/lib/content';

export const dynamic = 'force-static';

/**
 * The website's content as it is now, for the Niura ERP's "import website
 * content" button. Everything here is already public on the site.
 */
export function GET() {
  return Response.json({
    packages: getPackages(),
    visas: getVisas(),
    destinations: getDestinations(),
    guides: getGuides(),
    pages: { about: getPage('about'), privacy: getPage('privacy'), terms: getPage('terms') },
    site: getSite(),
    home: getHome(),
    testimonials: { items: getTestimonials() },
    faq: { items: getFaqs() },
  });
}
