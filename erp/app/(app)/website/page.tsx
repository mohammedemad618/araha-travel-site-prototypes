import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { requireTenant } from '@/lib/session';
import { getI18n } from '@/lib/i18n/server';
import { repo } from '@/lib/repo';
import { formatDateTime } from '@/lib/dates';
import { listMedia, mediaPath } from '@/lib/media';
import { hasUnpublished } from '@/lib/website-publish';
import { MEDIA_PREFIX, SINGLE_KEY, imageSources, pageKeys, singleKinds } from '@/lib/site-content';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, Tabs } from '@/components/ui';
import { DeleteMediaButton, ImportContentButton, PublishNowButton } from './WebsiteActions';
import { MediaUpload } from './MediaUpload';

export const metadata: Metadata = { title: 'Website content' };

const TABS = ['package', 'visa', 'destination', 'guide', 'page', 'settings', 'media'] as const;
type Tab = (typeof TABS)[number];

export default async function WebsitePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireTenant('website.write');
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'package';
  const r = await repo(ctx);
  const [pages, packages, media] = await Promise.all([
    r.siteContent.find({}).sort({ key: 1 }).toArray(),
    r.packages.find({}).sort({ active: -1, title: 1 }).toArray(),
    listMedia(ctx.tenantId),
  ]);
  const w = ctx.tenant.website;
  const pending = hasUnpublished(ctx.tenant);
  const of = (kind: string) => pages.filter((p) => p.kind === kind);
  const usedMedia = new Set(
    pages.flatMap((p) => imageSources(p.data)).filter((s) => s.startsWith(MEDIA_PREFIX)),
  );
  const localized = (v: unknown) => {
    const o = (v ?? {}) as { ar?: string; en?: string };
    return (lang === 'en' ? o.en || o.ar : o.ar || o.en) || '—';
  };

  return (
    <>
      <PageHeader title={t('website.title')} intro={t('website.intro')} />

      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              <Globe size={17} aria-hidden="true" />
              {w.siteUrl ? (
                <a
                  href={w.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-info hover:underline"
                  dir="ltr"
                >
                  {w.siteUrl.replace(/^https:\/\//, '')}
                </a>
              ) : (
                t('website.noSiteUrl')
              )}
              {pending ? (
                <Badge tone="warning">{t('website.pending')}</Badge>
              ) : (
                <Badge tone="success">{t('website.upToDate')}</Badge>
              )}
            </div>
            <p className="m-0 text-[13px] text-muted">
              {w.lastPublishedAt
                ? t('inventory.lastPublished', { date: formatDateTime(w.lastPublishedAt, lang) })
                : t('website.neverPublished')}
            </p>
            {!w.buildHookUrl && (
              <p className="m-0 text-[13px] text-warning">
                {t('website.noHook')}{' '}
                <Link href="/settings/website" className="underline">
                  {t('website.openSettings')}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {w.buildHookUrl && <PublishNowButton primary={pending} />}
            <ImportContentButton />
          </div>
        </div>
      </Card>

      <Tabs
        active={tab}
        tabs={[
          {
            key: 'package',
            label: t('website.tabs.package'),
            href: '/website?tab=package',
            count: of('package').length,
          },
          { key: 'visa', label: t('website.tabs.visa'), href: '/website?tab=visa', count: of('visa').length },
          {
            key: 'destination',
            label: t('website.tabs.destination'),
            href: '/website?tab=destination',
            count: of('destination').length,
          },
          {
            key: 'guide',
            label: t('website.tabs.guide'),
            href: '/website?tab=guide',
            count: of('guide').length,
          },
          { key: 'page', label: t('website.tabs.page'), href: '/website?tab=page' },
          { key: 'settings', label: t('website.tabs.settings'), href: '/website?tab=settings' },
          { key: 'media', label: t('website.tabs.media'), href: '/website?tab=media', count: media.length },
        ]}
      />

      {tab === 'package' && (
        <Card padded={false}>
          {packages.length === 0 ? (
            <EmptyState title={t('website.noPackages')} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t('website.page')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('website.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => {
                  const page = pages.find((x) => x.kind === 'package' && x.key === p.slug);
                  const hidden = page?.data.hidden === true || !p.active;
                  return (
                    <tr key={String(p._id)}>
                      <td>
                        <Link href={`/website/package/${p.slug}`} className="font-medium hover:underline">
                          {page ? localized(page.data.title) : p.title}
                        </Link>
                        <div className="text-[12px] text-faint" dir="ltr">
                          /{p.slug}
                        </div>
                      </td>
                      <td>
                        {!page ? (
                          <Badge tone="neutral">{t('website.noPage')}</Badge>
                        ) : hidden ? (
                          <Badge tone="warning">{t('website.hidden')}</Badge>
                        ) : (
                          <Badge tone="success">{t('website.live')}</Badge>
                        )}
                      </td>
                      <td className="text-[13px] text-muted">
                        {page ? formatDateTime(page.updatedAt, lang) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {(tab === 'visa' || tab === 'destination' || tab === 'guide') && (
        <Card
          padded={false}
          actions={
            <LinkButton href={`/website/${tab}/new`} variant="primary" size="sm">
              {t(`website.new.${tab}`)}
            </LinkButton>
          }
          title={t(`website.tabs.${tab}`)}
        >
          {of(tab).length === 0 ? (
            <EmptyState title={t('website.nothingYet')} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>{t('website.page')}</th>
                  <th>{t('website.updated')}</th>
                </tr>
              </thead>
              <tbody>
                {of(tab).map((p) => (
                  <tr key={String(p._id)}>
                    <td>
                      <Link href={`/website/${tab}/${p.key}`} className="font-medium hover:underline">
                        {tab === 'visa' ? p.key : localized(tab === 'guide' ? p.data.title : p.data.name)}
                      </Link>
                      {tab === 'visa' && (
                        <span className="ms-2">
                          <Badge tone="info">{t(`website.visaStatuses.${String(p.data.status)}`)}</Badge>
                        </span>
                      )}
                      <div className="text-[12px] text-faint" dir="ltr">
                        {p.key}
                      </div>
                    </td>
                    <td className="text-[13px] text-muted">{formatDateTime(p.updatedAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {(tab === 'page' || tab === 'settings') && (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <th>{t('website.page')}</th>
                <th>{t('website.updated')}</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'page'
                ? pageKeys.map((k) => ({ kind: 'page' as const, key: k, label: t(`website.pages.${k}`) }))
                : singleKinds.map((k) => ({ kind: k, key: SINGLE_KEY, label: t(`website.tabs.${k}`) }))
              ).map((row) => {
                const page = pages.find((p) => p.kind === row.kind && p.key === row.key);
                return (
                  <tr key={`${row.kind}:${row.key}`}>
                    <td>
                      <Link href={`/website/${row.kind}/${row.key}`} className="font-medium hover:underline">
                        {row.label}
                      </Link>
                      {!page && (
                        <span className="ms-2">
                          <Badge tone="warning">{t('website.notImported')}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="text-[13px] text-muted">
                      {page ? formatDateTime(page.updatedAt, lang) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'media' && (
        <Card title={t('website.library')} actions={null}>
          <div className="mb-5">
            <MediaUpload />
          </div>
          {media.length === 0 ? (
            <p className="m-0 text-[13.5px] text-muted">{t('website.libraryEmpty')}</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((m) => (
                <li key={String(m._id)} className="overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaPath(m._id)}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="min-w-0 truncate text-[12px] text-muted" dir="ltr">
                      {m.filename}
                    </span>
                    {usedMedia.has(`${MEDIA_PREFIX}${m._id}`) ? (
                      <Badge tone="success">{t('website.inUse')}</Badge>
                    ) : (
                      <DeleteMediaButton id={String(m._id)} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
