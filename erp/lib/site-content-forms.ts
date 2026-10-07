import type { TFn } from './i18n/translate';
import { homeLayouts, travelStyles, visaStatuses } from './site-content';

// The editor's layout for each kind of website page. Labels are translated on
// the server; the spec is plain data handed to the client editor.

type Opt = { value: string; label: string };
type Base = { name: string; label: string; hint?: string; required?: boolean };

export type FieldSpec =
  | (Base & { kind: 'loc'; multiline?: boolean })
  | (Base & { kind: 'text'; dir?: 'ltr' | 'rtl' })
  | (Base & { kind: 'number' })
  | (Base & { kind: 'date' })
  | (Base & { kind: 'bool' })
  | (Base & { kind: 'select'; options: Opt[] })
  | (Base & { kind: 'checks'; options: Opt[] })
  | (Base & { kind: 'image' })
  | (Base & { kind: 'group'; fields: FieldSpec[] })
  | (Base & { kind: 'locList'; itemLabel: string; multiline?: boolean })
  | (Base & { kind: 'urlList'; itemLabel: string })
  | (Base & { kind: 'repeat'; itemLabel: string; item: FieldSpec })
  | { kind: 'section'; name: ''; label: string; hint?: string; fields: FieldSpec[] };

const section = (label: string, fields: FieldSpec[], hint?: string): FieldSpec => ({
  kind: 'section',
  name: '',
  label,
  hint,
  fields,
});
const loc = (name: string, label: string, opts: Partial<Base & { multiline: boolean }> = {}): FieldSpec => ({
  kind: 'loc',
  name,
  label,
  required: true,
  ...opts,
});
const optLoc = (name: string, label: string, multiline = false): FieldSpec => ({
  kind: 'loc',
  name,
  label,
  multiline,
  required: false,
});

function seoSection(t: TFn): FieldSpec {
  return section(
    t('website.f.seo'),
    [
      {
        kind: 'group',
        name: 'seo',
        label: '',
        fields: [
          optLoc('title', t('website.f.seoTitle')),
          optLoc('description', t('website.f.seoDescription'), true),
        ],
      },
    ],
    t('website.f.seoHint'),
  );
}

export function packageFields(t: TFn, destinations: Opt[]): FieldSpec[] {
  return [
    section(t('website.f.basics'), [
      loc('title', t('website.f.title')),
      {
        kind: 'select',
        name: 'destination',
        label: t('website.f.destination'),
        required: true,
        options: destinations,
        hint: t('website.f.destinationHint'),
      },
      {
        kind: 'checks',
        name: 'styles',
        label: t('website.f.styles'),
        required: true,
        options: travelStyles.map((s) => ({ value: s, label: t(`website.styles.${s}`) })),
      },
      optLoc('badge', t('website.f.badge')),
      { kind: 'number', name: 'order', label: t('website.f.order'), hint: t('website.f.orderHint') },
      { kind: 'bool', name: 'hidden', label: t('website.f.hidden'), hint: t('website.f.hiddenHint') },
    ]),
    section(
      t('website.f.pricing'),
      [
        loc('priceNote', t('website.f.priceNote')),
        { kind: 'date', name: 'priceValidUntil', label: t('website.f.priceValidUntil') },
      ],
      t('website.f.pricingHint'),
    ),
    section(t('website.f.texts'), [
      loc('lead', t('website.f.lead'), { multiline: true }),
      loc('overview', t('website.f.overview'), { multiline: true }),
      {
        kind: 'locList',
        name: 'highlights',
        label: t('website.f.highlights'),
        itemLabel: t('website.f.highlight'),
        required: true,
      },
    ]),
    section(t('website.f.facts'), [
      {
        kind: 'group',
        name: 'facts',
        label: '',
        fields: [
          loc('route', t('website.f.route')),
          loc('stay', t('website.f.stay')),
          loc('flights', t('website.f.flights')),
          loc('season', t('website.f.season')),
          loc('group', t('website.f.groupSize')),
        ],
      },
    ]),
    section(t('website.f.itinerary'), [
      {
        kind: 'repeat',
        name: 'itinerary',
        label: t('website.f.days'),
        itemLabel: t('website.f.day'),
        required: true,
        item: {
          kind: 'group',
          name: '',
          label: '',
          fields: [
            loc('title', t('website.f.dayTitle')),
            loc('description', t('website.f.dayDescription'), { multiline: true }),
            { kind: 'locList', name: 'tags', label: t('website.f.tags'), itemLabel: t('website.f.tag') },
          ],
        },
      },
    ]),
    section(t('website.f.includes'), [
      {
        kind: 'locList',
        name: 'includes',
        label: t('website.f.included'),
        itemLabel: t('website.f.item'),
        required: true,
      },
      { kind: 'locList', name: 'excludes', label: t('website.f.excluded'), itemLabel: t('website.f.item') },
    ]),
    section(t('website.f.images'), [
      { kind: 'image', name: 'image', label: t('website.f.mainImage'), required: true },
      {
        kind: 'repeat',
        name: 'gallery',
        label: t('website.f.gallery'),
        itemLabel: t('website.f.photo'),
        item: { kind: 'image', name: '', label: '' },
      },
    ]),
    seoSection(t),
  ];
}

export function visaFields(t: TFn): FieldSpec[] {
  return [
    section(t('website.f.basics'), [
      {
        kind: 'select',
        name: 'status',
        label: t('website.f.visaStatus'),
        required: true,
        options: visaStatuses.map((s) => ({ value: s, label: t(`website.visaStatuses.${s}`) })),
      },
      loc('summary', t('website.f.summary'), { multiline: true }),
      loc('howToApply', t('website.f.howToApply'), { multiline: true }),
      optLoc('processingTime', t('website.f.processingTime')),
      optLoc('stay', t('website.f.visaStay')),
      { kind: 'date', name: 'lastVerified', label: t('website.f.lastVerified'), required: true },
    ]),
    section(t('website.f.requirements'), [
      { kind: 'locList', name: 'documents', label: t('website.f.documents'), itemLabel: t('website.f.item') },
      {
        kind: 'locList',
        name: 'exemptions',
        label: t('website.f.exemptions'),
        itemLabel: t('website.f.item'),
      },
      optLoc('notes', t('website.f.notes'), true),
    ]),
    section(t('website.f.sources'), [
      { kind: 'text', name: 'officialUrl', label: t('website.f.officialUrl'), dir: 'ltr' },
      { kind: 'urlList', name: 'sources', label: t('website.f.sourceLinks'), itemLabel: t('website.f.link') },
    ]),
  ];
}

export function destinationFields(t: TFn): FieldSpec[] {
  return [
    section(t('website.f.basics'), [
      loc('name', t('website.f.name')),
      {
        kind: 'text',
        name: 'label',
        label: t('website.f.label'),
        required: true,
        hint: t('website.f.labelHint'),
      },
      {
        kind: 'text',
        name: 'coord',
        label: t('website.f.coord'),
        required: true,
        dir: 'ltr',
        hint: t('website.f.coordHint'),
      },
      loc('tagline', t('website.f.tagline')),
      loc('description', t('website.f.description'), { multiline: true }),
      loc('bestSeason', t('website.f.bestSeason')),
      {
        kind: 'select',
        name: 'homeLayout',
        label: t('website.f.homeLayout'),
        required: true,
        options: homeLayouts.map((l) => ({ value: l, label: t(`website.layouts.${l}`) })),
      },
      { kind: 'number', name: 'order', label: t('website.f.order'), hint: t('website.f.orderHint') },
    ]),
    section(t('website.f.glance'), [
      {
        kind: 'group',
        name: 'glance',
        label: '',
        fields: [
          optLoc('flightTime', t('website.f.flightTime')),
          optLoc('currency', t('website.f.currency')),
          optLoc('language', t('website.f.language')),
          optLoc('timeDifference', t('website.f.timeDifference')),
        ],
      },
    ]),
    section(t('website.f.images'), [
      { kind: 'image', name: 'image', label: t('website.f.mainImage'), required: true },
    ]),
    seoSection(t),
  ];
}

/** A starting point for a new page, so required lists show one empty row. */
export function blankContent(kind: 'package' | 'visa' | 'destination'): Record<string, unknown> {
  const l = () => ({ ar: '', en: '' });
  const img = () => ({ src: '', alt: l(), credit: '', creditUrl: '' });
  if (kind === 'package')
    return {
      title: l(),
      destination: '',
      styles: [],
      priceNote: l(),
      priceValidUntil: '',
      highlights: [l()],
      lead: l(),
      overview: l(),
      facts: { route: l(), stay: l(), flights: l(), season: l(), group: l() },
      image: img(),
      gallery: [],
      itinerary: [{ title: l(), description: l(), tags: [] }],
      includes: [l()],
      excludes: [],
      badge: l(),
      order: 100,
      seo: { title: l(), description: l() },
      hidden: false,
    };
  if (kind === 'visa')
    return {
      status: 'e-visa',
      summary: l(),
      howToApply: l(),
      processingTime: l(),
      stay: l(),
      exemptions: [],
      documents: [l()],
      notes: l(),
      officialUrl: '',
      sources: [],
      lastVerified: new Date().toISOString().slice(0, 10),
    };
  return {
    name: l(),
    label: '',
    coord: '',
    tagline: l(),
    description: l(),
    bestSeason: l(),
    glance: { flightTime: l(), currency: l(), language: l(), timeDifference: l() },
    image: img(),
    homeLayout: 'mid',
    order: 100,
    seo: { title: l(), description: l() },
  };
}
