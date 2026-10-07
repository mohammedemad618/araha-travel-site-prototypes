import type { TFn } from './i18n/translate';
import {
  guideCategories,
  homeLayouts,
  iconNames,
  reviewSources,
  travelStyles,
  visaStatuses,
  weekDays,
} from './site-content';
import type { SiteContentKind } from './types';

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

const sectionsList = (t: TFn, required = false): FieldSpec => ({
  kind: 'repeat',
  name: 'sections',
  label: t('website.f.sections'),
  itemLabel: t('website.f.section'),
  required,
  item: {
    kind: 'group',
    name: '',
    label: '',
    fields: [
      loc('heading', t('website.f.heading')),
      loc('body', t('website.f.body'), { multiline: true, hint: t('website.f.bodyHint') }),
    ],
  },
});

const iconOptions = (t: TFn): Opt[] => iconNames.map((i) => ({ value: i, label: t(`website.icons.${i}`) }));

const iconItems = (t: TFn, name: string, label: string, itemLabel: string): FieldSpec => ({
  kind: 'repeat',
  name,
  label,
  itemLabel,
  item: {
    kind: 'group',
    name: '',
    label: '',
    fields: [
      { kind: 'select', name: 'icon', label: t('website.f.icon'), required: true, options: iconOptions(t) },
      loc('title', t('website.f.itemTitle')),
      loc('description', t('website.f.itemDescription'), { multiline: true }),
    ],
  },
});

export function guideFields(t: TFn, destinations: Opt[]): FieldSpec[] {
  return [
    section(t('website.f.basics'), [
      loc('title', t('website.f.guideTitle')),
      loc('excerpt', t('website.f.excerpt'), { multiline: true }),
      {
        kind: 'select',
        name: 'category',
        label: t('website.f.category'),
        required: true,
        options: guideCategories.map((c) => ({ value: c, label: t(`website.guideCategories.${c}`) })),
      },
      { kind: 'date', name: 'date', label: t('website.f.publishDate'), required: true },
      {
        kind: 'select',
        name: 'destination',
        label: t('website.f.relatedDestination'),
        options: destinations,
      },
    ]),
    section(t('website.f.images'), [
      { kind: 'image', name: 'image', label: t('website.f.mainImage'), required: true },
    ]),
    section(t('website.f.article'), [sectionsList(t, true)]),
    seoSection(t),
  ];
}

export function pageFields(t: TFn): FieldSpec[] {
  return [
    section(t('website.f.basics'), [
      loc('title', t('website.f.pageTitle')),
      loc('eyebrow', t('website.f.eyebrow')),
      loc('intro', t('website.f.intro'), { multiline: true }),
      loc('seoDescription', t('website.f.seoDescription'), { multiline: true }),
    ]),
    section(t('website.f.images'), [
      { kind: 'image', name: 'image', label: t('website.f.optionalImage'), required: false },
    ]),
    section(t('website.f.article'), [sectionsList(t)]),
  ];
}

export function siteFields(t: TFn): FieldSpec[] {
  const num = (name: string, label: string, hint?: string): FieldSpec => ({
    kind: 'number',
    name,
    label,
    hint,
  });
  const url = (name: string, label: string): FieldSpec => ({ kind: 'text', name, label, dir: 'ltr' });
  return [
    section(t('website.f.identity'), [
      loc('name', t('website.f.companyName')),
      loc('shortName', t('website.f.shortName')),
      loc('tagline', t('website.f.tagline')),
      loc('description', t('website.f.siteDescription'), { multiline: true }),
      { kind: 'text', name: 'url', label: t('website.f.siteUrl'), dir: 'ltr', required: true },
    ]),
    section(t('website.f.contact'), [
      {
        kind: 'text',
        name: 'phone',
        label: t('website.f.phone'),
        dir: 'ltr',
        required: true,
        hint: t('website.f.phoneHint'),
      },
      { kind: 'text', name: 'phoneDisplay', label: t('website.f.phoneDisplay'), dir: 'ltr', required: true },
      {
        kind: 'text',
        name: 'whatsapp',
        label: t('website.f.whatsapp'),
        dir: 'ltr',
        required: true,
        hint: t('website.f.whatsappHint'),
      },
      {
        kind: 'text',
        name: 'whatsappDisplay',
        label: t('website.f.whatsappDisplay'),
        dir: 'ltr',
        required: true,
      },
      { kind: 'text', name: 'email', label: t('website.f.email'), dir: 'ltr' },
      loc('address', t('website.f.address')),
      {
        kind: 'text',
        name: 'mapQuery',
        label: t('website.f.mapQuery'),
        required: true,
        hint: t('website.f.mapQueryHint'),
      },
      optLoc('license', t('website.f.license')),
    ]),
    section(t('website.f.hours'), [
      loc('hours', t('website.f.hoursText')),
      {
        kind: 'group',
        name: 'openingHours',
        label: '',
        fields: [
          {
            kind: 'checks',
            name: 'days',
            label: t('website.f.openDays'),
            options: weekDays.map((d) => ({ value: d, label: t(`website.days.${d}`) })),
          },
          {
            kind: 'text',
            name: 'opens',
            label: t('website.f.opens'),
            dir: 'ltr',
            required: true,
            hint: '09:00',
          },
          {
            kind: 'text',
            name: 'closes',
            label: t('website.f.closes'),
            dir: 'ltr',
            required: true,
            hint: '21:00',
          },
        ],
      },
    ]),
    section(t('website.f.social'), [
      {
        kind: 'group',
        name: 'social',
        label: '',
        fields: [url('instagram', 'Instagram'), url('facebook', 'Facebook'), url('tiktok', 'TikTok')],
      },
    ]),
    section(
      t('website.f.trust'),
      [
        {
          kind: 'group',
          name: 'trust',
          label: '',
          fields: [
            num('since', t('website.f.since')),
            num('travellers', t('website.f.travellers')),
            num('googleRating', t('website.f.googleRating'), '1 – 5'),
            num('googleReviews', t('website.f.googleReviews')),
            url('googleMapsUrl', t('website.f.googleMapsUrl')),
            url('licenceUrl', t('website.f.licenceUrl')),
          ],
        },
      ],
      t('website.f.trustHint'),
    ),
    section(t('website.f.payments'), [
      {
        kind: 'group',
        name: 'pricing',
        label: '',
        fields: [
          num('usdRate', t('website.f.usdRate')),
          { kind: 'date', name: 'rateUpdated', label: t('website.f.rateUpdated') },
        ],
      },
      {
        kind: 'locList',
        name: 'paymentMethods',
        label: t('website.f.paymentMethods'),
        itemLabel: t('website.f.paymentMethod'),
      },
    ]),
  ];
}

export function homeFields(t: TFn, packages: Opt[]): FieldSpec[] {
  const pkg = (name: string, label: string): FieldSpec => ({
    kind: 'select',
    name,
    label,
    required: true,
    options: packages,
  });
  return [
    section(t('website.f.hero'), [
      {
        kind: 'group',
        name: 'hero',
        label: '',
        fields: [
          { kind: 'text', name: 'eyebrow', label: t('website.f.eyebrow'), required: true },
          {
            kind: 'group',
            name: 'headline',
            label: t('website.f.headline'),
            fields: [loc('0', t('website.f.headlineLine1')), loc('1', t('website.f.headlineLine2'))],
          },
          loc('intro', t('website.f.intro'), { multiline: true }),
          {
            kind: 'repeat',
            name: 'slides',
            label: t('website.f.slides'),
            itemLabel: t('website.f.slide'),
            required: true,
            item: {
              kind: 'group',
              name: '',
              label: '',
              fields: [
                loc('place', t('website.f.place')),
                { kind: 'text', name: 'coord', label: t('website.f.coord'), dir: 'ltr', required: true },
                { kind: 'image', name: 'image', label: t('website.f.photo'), required: true },
              ],
            },
          },
        ],
      },
    ]),
    section(t('website.f.trustPoints'), [
      iconItems(t, 'trustPoints', t('website.f.trustPoints'), t('website.f.point')),
    ]),
    section(t('website.f.travelStyles'), [
      {
        kind: 'repeat',
        name: 'styles',
        label: t('website.f.travelStyles'),
        itemLabel: t('website.f.style'),
        item: {
          kind: 'group',
          name: '',
          label: '',
          fields: [
            {
              kind: 'select',
              name: 'style',
              label: t('website.f.style'),
              required: true,
              options: travelStyles.map((s) => ({ value: s, label: t(`website.styles.${s}`) })),
            },
            loc('title', t('website.f.itemTitle')),
            loc('description', t('website.f.itemDescription'), { multiline: true }),
            { kind: 'image', name: 'image', label: t('website.f.photo'), required: true },
          ],
        },
      },
    ]),
    section(t('website.f.featured'), [pkg('featuredPackage', t('website.f.featuredPackage'))]),
    section(t('website.f.servicesSection'), [
      iconItems(t, 'services', t('website.f.servicesSection'), t('website.f.service')),
    ]),
    section(t('website.f.benefits'), [
      {
        kind: 'repeat',
        name: 'benefits',
        label: t('website.f.benefits'),
        itemLabel: t('website.f.benefit'),
        item: {
          kind: 'group',
          name: '',
          label: '',
          fields: [
            loc('title', t('website.f.itemTitle')),
            loc('description', t('website.f.itemDescription'), { multiline: true }),
          ],
        },
      },
    ]),
    section(t('website.f.offer'), [
      {
        kind: 'group',
        name: 'offer',
        label: '',
        fields: [
          pkg('package', t('website.f.offerPackage')),
          { kind: 'text', name: 'eyebrow', label: t('website.f.eyebrow'), required: true },
          loc('title', t('website.f.offerTitle')),
          loc('route', t('website.f.route')),
          loc('note', t('website.f.offerNote')),
          { kind: 'date', name: 'validUntil', label: t('website.f.validUntil') },
          { kind: 'image', name: 'image', label: t('website.f.photo'), required: true },
        ],
      },
    ]),
    section(t('website.f.finalSection'), [
      { kind: 'image', name: 'finalImage', label: t('website.f.finalImage'), required: true },
    ]),
  ];
}

export function testimonialsFields(t: TFn, destinations: Opt[]): FieldSpec[] {
  return [
    section(
      t('website.tabs.testimonials'),
      [
        {
          kind: 'repeat',
          name: 'items',
          label: t('website.f.reviews'),
          itemLabel: t('website.f.review'),
          item: {
            kind: 'group',
            name: '',
            label: '',
            fields: [
              loc('quote', t('website.f.quote'), { multiline: true }),
              loc('name', t('website.f.customerName')),
              {
                kind: 'select',
                name: 'destination',
                label: t('website.f.destination'),
                required: true,
                options: destinations,
              },
              {
                kind: 'bool',
                name: 'verified',
                label: t('website.f.verified'),
                hint: t('website.f.verifiedHint'),
              },
              {
                kind: 'select',
                name: 'source',
                label: t('website.f.reviewSource'),
                options: reviewSources.map((r) => ({ value: r, label: t(`website.reviewSources.${r}`) })),
              },
              { kind: 'number', name: 'rating', label: t('website.f.rating'), hint: '1 – 5' },
              { kind: 'date', name: 'date', label: t('website.f.reviewDate') },
              { kind: 'text', name: 'url', label: t('website.f.reviewUrl'), dir: 'ltr' },
              { kind: 'image', name: 'image', label: t('website.f.photo'), required: true },
            ],
          },
        },
      ],
      t('website.f.reviewsHint'),
    ),
  ];
}

export function faqFields(t: TFn): FieldSpec[] {
  return [
    section(t('website.tabs.faq'), [
      {
        kind: 'repeat',
        name: 'items',
        label: t('website.f.questions'),
        itemLabel: t('website.f.question'),
        item: {
          kind: 'group',
          name: '',
          label: '',
          fields: [
            loc('question', t('website.f.question')),
            loc('answer', t('website.f.answer'), { multiline: true }),
          ],
        },
      },
    ]),
  ];
}

/** A starting point for a new page, so required lists show one empty row. */
export function blankContent(kind: SiteContentKind): Record<string, unknown> {
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
  if (kind === 'guide')
    return {
      title: l(),
      excerpt: l(),
      category: 'tips',
      date: new Date().toISOString().slice(0, 10),
      image: img(),
      destination: '',
      sections: [{ heading: l(), body: l() }],
      seo: { title: l(), description: l() },
    };
  if (kind === 'page')
    return { title: l(), eyebrow: l(), intro: l(), image: img(), sections: [], seoDescription: l() };
  if (kind === 'testimonials' || kind === 'faq') return { items: [] };
  if (kind === 'site' || kind === 'home') return {};
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
