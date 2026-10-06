import { getDestinations, getPackages } from '@/lib/content';

export const dynamic = 'force-static';

/**
 * Package list for the Niura ERP's "import from website" button: identifiers,
 * names, prices and dates only (everything here is already public on the site).
 */
export function GET() {
  const destinations = new Map(getDestinations().map((d) => [d.slug, d.name]));
  const packages = getPackages().map((p) => ({
    slug: p.slug,
    title: p.title.ar,
    titleEn: p.title.en,
    destination: destinations.get(p.destination)?.ar ?? p.destination,
    days: p.days,
    nights: p.nights,
    currency: 'IQD',
    price: p.price,
    childPrice: p.childPrice,
    departures: p.departures.map((d) => ({ date: d.date, status: d.status })),
  }));
  return Response.json({ packages });
}
