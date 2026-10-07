import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { listMedia } from '@/lib/media';
import { saveContent } from '@/lib/actions/site-content';
import { isSingle, validKey } from '@/lib/site-content';
import {
  blankContent,
  destinationFields,
  faqFields,
  guideFields,
  homeFields,
  packageFields,
  pageFields,
  siteFields,
  testimonialsFields,
  visaFields,
  type FieldSpec,
} from '@/lib/site-content-forms';
import { siteContentKinds, type SiteContentKind } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui';
import { ContentEditor } from '@/components/content/ContentEditor';
import { DeleteGuideButton } from '../../WebsiteActions';

export const metadata: Metadata = { title: 'Edit website page' };

/** Kinds whose pages are created here, with an identifier typed by the editor. */
const CREATABLE: SiteContentKind[] = ['visa', 'destination', 'guide'];

/** Where the edited page lives on the website. */
function sitePath(kind: SiteContentKind, key: string, lang: string): string {
  switch (kind) {
    case 'package':
      return `/${lang}/packages/${key}/`;
    case 'destination':
      return `/${lang}/destinations/${key}/`;
    case 'visa':
      return `/${lang}/visa/`;
    case 'guide':
      return `/${lang}/guides/${key}/`;
    case 'page':
      return `/${lang}/${key}/`;
    case 'faq':
      return `/${lang}/faq/`;
    default:
      return `/${lang}/`;
  }
}

export default async function EditWebsitePage({
  params,
}: {
  params: Promise<{ kind: string; key: string }>;
}) {
  const ctx = await requireTenant('website.write');
  const { t, lang } = await getI18n();
  const { kind: rawKind, key } = await params;
  if (!(siteContentKinds as readonly string[]).includes(rawKind)) notFound();
  const kind = rawKind as SiteContentKind;
  const isNew = key === 'new';
  if (isNew ? !CREATABLE.includes(kind) : !validKey(kind, key)) notFound();

  const r = await repo(ctx);
  const [page, pkg, destinations, packagePages, media] = await Promise.all([
    isNew ? null : r.siteContent.findOne({ kind, key }),
    kind === 'package' ? r.packages.findOne({ slug: key }) : null,
    r.siteContent.find({ kind: 'destination' }).sort({ key: 1 }).toArray(),
    kind === 'home' ? r.siteContent.find({ kind: 'package' }).sort({ key: 1 }).toArray() : [],
    listMedia(ctx.tenantId),
  ]);
  if (kind === 'package' && !pkg) notFound();
  // Destinations, visas and guides are created from "new"; fixed pages and
  // single sections can be filled in even before they were imported.
  if (!isNew && CREATABLE.includes(kind) && !page) notFound();

  const initial = page?.data ?? blankContent(kind);
  const nameOf = (v: unknown) => {
    const o = (v ?? {}) as { ar?: string; en?: string };
    return (lang === 'en' ? o.en || o.ar : o.ar || o.en) || '';
  };
  const options = (
    list: { key: string; data: Record<string, unknown> }[],
    field: string,
    current: unknown[],
  ) => {
    const opts = list.map((d) => ({ value: d.key, label: `${nameOf(d.data[field])} (${d.key})` }));
    for (const c of current)
      if (typeof c === 'string' && c && !opts.some((o) => o.value === c)) opts.push({ value: c, label: c });
    return opts;
  };
  const items = Array.isArray(initial.items) ? (initial.items as Record<string, unknown>[]) : [];
  const destinationOptions = options(destinations, 'name', [
    initial.destination,
    ...items.map((i) => i.destination),
  ]);
  const offer = (initial.offer ?? {}) as Record<string, unknown>;
  const packageOptions = options(packagePages, 'title', [initial.featuredPackage, offer.package]);

  const fields: Record<SiteContentKind, () => FieldSpec[]> = {
    package: () => packageFields(t, destinationOptions),
    visa: () => visaFields(t),
    destination: () => destinationFields(t),
    guide: () => guideFields(t, destinationOptions),
    page: () => pageFields(t),
    site: () => siteFields(t),
    home: () => homeFields(t, packageOptions),
    testimonials: () => testimonialsFields(t, destinationOptions),
    faq: () => faqFields(t),
  };
  const site = ctx.tenant.website.siteUrl?.replace(/\/+$/, '');
  const title = isNew
    ? t(`website.new.${kind}`)
    : isSingle(kind)
      ? t(`website.tabs.${kind}`)
      : kind === 'page'
        ? nameOf(initial.title) || t(`website.pages.${key}`)
        : kind === 'package'
          ? nameOf(initial.title) || pkg!.title
          : kind === 'visa'
            ? `${t('website.tabs.visa')}: ${key}`
            : nameOf(initial.title ?? initial.name) || key;
  const backTab = isSingle(kind) ? 'settings' : kind;

  return (
    <>
      <PageHeader
        title={title}
        intro={
          kind === 'package' ? (page ? t('website.packageIntro') : t('website.packageNewIntro')) : undefined
        }
        back={{ href: `/website?tab=${backTab}`, label: t('website.title') }}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {site && !isNew && page && kind !== 'site' && (
              <a
                href={`${site}${sitePath(kind, key, lang)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13.5px] text-info hover:underline"
              >
                <ExternalLink size={15} aria-hidden="true" />
                {t('website.viewOnSite')}
              </a>
            )}
            {kind === 'guide' && !isNew && page && <DeleteGuideButton contentKey={key} />}
          </div>
        }
      />
      <Card>
        <ContentEditor
          action={saveContent}
          kind={kind}
          contentKey={isNew ? '' : key}
          isNew={isNew}
          keyLabel={t(kind === 'visa' ? 'website.visaKey' : 'website.destinationKey')}
          keyHint={t('website.keyHint')}
          fields={fields[kind]()}
          initial={initial}
          media={media.map((m) => ({ id: String(m._id), name: m.filename }))}
          siteUrl={site}
        />
      </Card>
    </>
  );
}
