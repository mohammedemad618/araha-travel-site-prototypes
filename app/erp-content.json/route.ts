import { getDestinations, getPackages, getVisas } from '@/lib/content';

export const dynamic = 'force-static';

/**
 * The website's pages as they are now, for the Niura ERP's "import website
 * content" button. Everything here is already public on the site.
 */
export function GET() {
  return Response.json({
    packages: getPackages(),
    visas: getVisas(),
    destinations: getDestinations(),
  });
}
