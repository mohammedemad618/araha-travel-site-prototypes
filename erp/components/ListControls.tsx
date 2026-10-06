import Link from 'next/link';
import { Search } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';
import { PAGE_SIZE } from '@/lib/queries';
import { buttonClass } from './ui';

/** Keeps the current filters when building a link to another page/filter. */
export function withParams(
  base: string,
  params: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const merged = { ...params, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

/** GET search box plus optional select filters; submitting reloads the list. */
export async function FilterBar({
  q,
  hidden = {},
  selects = [],
  children,
}: {
  q?: string;
  hidden?: Record<string, string | undefined>;
  selects?: { name: string; label: string; value?: string; options: { value: string; label: string }[] }[];
  children?: React.ReactNode;
}) {
  const { t } = await getI18n();
  return (
    <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
      {Object.entries(hidden).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <input
          name="q"
          type="search"
          defaultValue={q}
          aria-label={t('common.search')}
          placeholder={t('common.searchPlaceholder')}
          className="field-input ps-9"
        />
      </div>
      {selects.map((s) => (
        <label key={s.name} className="flex flex-col gap-1 text-[12px] text-muted">
          <span className="sr-only">{s.label}</span>
          <select
            name={s.name}
            defaultValue={s.value ?? ''}
            className="field-input min-w-[150px]"
            aria-label={s.label}
          >
            <option value="">
              {s.label}: {t('common.all')}
            </option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className={buttonClass('secondary')}>
        {t('common.filter')}
      </button>
      {children}
    </form>
  );
}

export async function Pagination({
  base,
  params,
  page,
  total,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
}) {
  const { t } = await getI18n();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <nav
      className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-muted"
      aria-label="pagination"
    >
      <span>{t('common.pageOf', { page, pages })}</span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            className={buttonClass('secondary', 'sm')}
            href={withParams(base, params, { page: String(page - 1) })}
          >
            {t('common.prev')}
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            className={buttonClass('secondary', 'sm')}
            href={withParams(base, params, { page: String(page + 1) })}
          >
            {t('common.next')}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
