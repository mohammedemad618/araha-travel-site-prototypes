import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { listMedia } from '@/lib/media';
import { saveContent } from '@/lib/actions/site-content';
import { blankContent, destinationFields, packageFields, visaFields } from '@/lib/site-content-forms';
import { siteContentKinds, type SiteContentKind } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui';
import { ContentEditor } from '@/components/content/ContentEditor';

export const metadata: Metadata = { title: 'Edit website page' };

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
  if (isNew && kind === 'package') notFound();
  const r = await repo(ctx);
  const [page, pkg, destinations, media] = await Promise.all([
    isNew ? null : r.siteContent.findOne({ kind, key }),
    kind === 'package' ? r.packages.findOne({ slug: key }) : null,
    r.siteContent.find({ kind: 'destination' }).sort({ key: 1 }).toArray(),
    listMedia(ctx.tenantId),
  ]);
  if (kind === 'package' && !pkg) notFound();
  if (!isNew && kind !== 'package' && !page) notFound();

  const initial = page?.data ?? blankContent(kind);
  const nameOf = (v: unknown) => {
    const o = (v ?? {}) as { ar?: string; en?: string };
    return (lang === 'en' ? o.en || o.ar : o.ar || o.en) || '';
  };
  const destinationOptions = destinations.map((d) => ({
    value: d.key,
    label: `${nameOf(d.data.name)} (${d.key})`,
  }));
  const current = typeof initial.destination === 'string' ? initial.destination : '';
  if (current && !destinationOptions.some((o) => o.value === current))
    destinationOptions.push({ value: current, label: current });

  const fields =
    kind === 'package'
      ? packageFields(t, destinationOptions)
      : kind === 'visa'
        ? visaFields(t)
        : destinationFields(t);
  const site = ctx.tenant.website.siteUrl?.replace(/\/+$/, '');
  const viewPath =
    kind === 'package'
      ? `/${lang}/packages/${key}/`
      : kind === 'destination'
        ? `/${lang}/destinations/${key}/`
        : `/${lang}/visa/`;
  const title = isNew
    ? t(kind === 'visa' ? 'website.newVisa' : 'website.newDestination')
    : kind === 'package'
      ? nameOf(initial.title) || pkg!.title
      : kind === 'visa'
        ? `${t('website.tabs.visa')}: ${key}`
        : nameOf(initial.name) || key;

  return (
    <>
      <PageHeader
        title={title}
        intro={
          kind === 'package' ? (page ? t('website.packageIntro') : t('website.packageNewIntro')) : undefined
        }
        back={{ href: `/website?tab=${kind}`, label: t('website.title') }}
        actions={
          site && !isNew && page ? (
            <a
              href={`${site}${viewPath}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13.5px] text-info hover:underline"
            >
              <ExternalLink size={15} aria-hidden="true" />
              {t('website.viewOnSite')}
            </a>
          ) : undefined
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
          fields={fields}
          initial={initial}
          media={media.map((m) => ({ id: String(m._id), name: m.filename }))}
          siteUrl={site}
        />
      </Card>
    </>
  );
}
