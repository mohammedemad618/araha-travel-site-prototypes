'use client';

import { useCallback, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { ActionForm, Field, SubmitButton, useFieldError } from '@/components/form';
import { buttonClass } from '@/components/ui';
import { useI18n } from '@/lib/i18n/client';
import type { ActionResult } from '@/lib/forms';
import type { FieldSpec } from '@/lib/site-content-forms';
import { MediaPicker, imagePreviewUrl, type MediaItem } from './MediaPicker';

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
type Json = Record<string, unknown>;
type Path = (string | number)[];

const join = (path: Path) => path.join('.');

function getAt(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Json)[k as string]), obj);
}

function setAt(obj: unknown, path: Path, value: unknown): unknown {
  if (!path.length) return value;
  const [head, ...rest] = path as [string | number, ...Path];
  if (typeof head === 'number') {
    const arr = Array.isArray(obj) ? [...obj] : [];
    arr[head] = setAt(arr[head], rest, value);
    return arr;
  }
  const o = obj && typeof obj === 'object' && !Array.isArray(obj) ? { ...(obj as Json) } : {};
  o[head] = setAt(o[head], rest, value);
  return o;
}

/** A blank value for a field, used when a list item is added. */
function blank(spec: FieldSpec): unknown {
  switch (spec.kind) {
    case 'loc':
      return { ar: '', en: '' };
    case 'checks':
    case 'locList':
    case 'urlList':
    case 'repeat':
      return [];
    case 'image':
      return { src: '', alt: { ar: '', en: '' }, credit: '', creditUrl: '' };
    case 'group':
      return Object.fromEntries(spec.fields.map((f) => [f.name, blank(f)]));
    case 'bool':
      return false;
    default:
      return '';
  }
}

type Ctx = {
  value: unknown;
  set: (path: Path, v: unknown) => void;
  media: MediaItem[];
  siteUrl?: string;
};

/**
 * Edits one website page. The whole page travels to the server as JSON in a
 * hidden "data" field; the server validates it against the website's schema and
 * returns field errors by path (e.g. "itinerary.2.title.en").
 */
export function ContentEditor({
  action,
  kind,
  contentKey,
  isNew,
  keyLabel,
  keyHint,
  fields,
  initial,
  media,
  siteUrl,
}: {
  action: Action;
  kind: string;
  contentKey?: string;
  isNew: boolean;
  keyLabel?: string;
  keyHint?: string;
  fields: FieldSpec[];
  initial: Json;
  media: MediaItem[];
  siteUrl?: string;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState<Json>(initial);
  const set = useCallback((path: Path, v: unknown) => setValue((cur) => setAt(cur, path, v) as Json), []);
  const ctx: Ctx = { value, set, media, siteUrl };
  return (
    <ActionForm action={action} className="flex flex-col gap-6">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="data" value={JSON.stringify(value)} />
      <input type="hidden" name="isNew" value={isNew ? '1' : ''} />
      {isNew ? (
        <Field label={keyLabel ?? 'key'} name="key" hint={keyHint} required>
          {(p) => (
            <input
              {...p}
              className="field-input max-w-sm"
              dir="ltr"
              defaultValue={contentKey ?? ''}
              required
            />
          )}
        </Field>
      ) : (
        <input type="hidden" name="key" value={contentKey} />
      )}
      {fields.map((f, i) => (
        <FieldView key={i} spec={f} path={f.name ? [f.name] : []} ctx={ctx} />
      ))}
      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-line bg-surface px-5 py-3">
        <SubmitButton>{t('website.saveAndPublish')}</SubmitButton>
        <span className="text-[12.5px] text-faint">{t('website.saveHint')}</span>
      </div>
    </ActionForm>
  );
}

function ErrorLine({ path }: { path: Path }) {
  const { t } = useI18n();
  const error = useFieldError(join(path));
  if (!error) return null;
  return <p className="m-0 text-[12.5px] text-danger">{t(`errors.${error}`)}</p>;
}

function FieldView({ spec, path, ctx }: { spec: FieldSpec; path: Path; ctx: Ctx }) {
  const { t } = useI18n();
  const v = getAt(ctx.value, path);
  switch (spec.kind) {
    case 'section':
      return (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-line p-4">
          <legend className="px-1 text-[14px] font-semibold">{spec.label}</legend>
          {spec.hint && <p className="m-0 -mt-2 text-[12.5px] text-faint">{spec.hint}</p>}
          {spec.fields.map((f, i) => (
            <FieldView key={i} spec={f} path={f.name ? [...path, f.name] : path} ctx={ctx} />
          ))}
        </fieldset>
      );
    case 'group':
      return (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] font-semibold text-ink-3">{spec.label}</div>
          {spec.fields.map((f, i) => (
            <FieldView key={i} spec={f} path={[...path, f.name]} ctx={ctx} />
          ))}
        </div>
      );
    case 'loc':
      return <LocField spec={spec} path={path} value={v} set={ctx.set} />;
    case 'text':
    case 'number':
    case 'date':
      return (
        <Field label={spec.label} name={join(path)} hint={spec.hint} required={spec.required}>
          {({ id, ...aria }) => (
            <input
              id={id}
              {...aria}
              type={spec.kind === 'text' ? 'text' : spec.kind}
              dir={spec.kind === 'text' ? spec.dir : 'ltr'}
              className="field-input max-w-sm"
              value={v == null ? '' : String(v)}
              onChange={(e) =>
                ctx.set(path, spec.kind === 'number' ? Number(e.target.value || 0) : e.target.value)
              }
            />
          )}
        </Field>
      );
    case 'select':
      return (
        <Field label={spec.label} name={join(path)} hint={spec.hint} required={spec.required}>
          {({ id, ...aria }) => (
            <select
              id={id}
              {...aria}
              className="field-input max-w-sm"
              value={String(v ?? '')}
              onChange={(e) => ctx.set(path, e.target.value)}
            >
              {!spec.required && <option value="">—</option>}
              {spec.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      );
    case 'checks': {
      const list = Array.isArray(v) ? (v as string[]) : [];
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-3">
            {spec.label}
            {spec.required ? <span className="text-danger"> *</span> : null}
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {spec.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  checked={list.includes(o.value)}
                  onChange={(e) =>
                    ctx.set(path, e.target.checked ? [...list, o.value] : list.filter((x) => x !== o.value))
                  }
                />
                {o.label}
              </label>
            ))}
          </div>
          <ErrorLine path={path} />
        </fieldset>
      );
    }
    case 'bool':
      return (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={v === true} onChange={(e) => ctx.set(path, e.target.checked)} />
          {spec.label}
          {spec.hint && <span className="text-[12.5px] text-faint">— {spec.hint}</span>}
        </label>
      );
    case 'image':
      return <ImageField label={spec.label} path={path} value={v} ctx={ctx} required={spec.required} />;
    case 'locList':
    case 'urlList':
    case 'repeat': {
      const list = Array.isArray(v) ? v : [];
      const item: FieldSpec =
        spec.kind === 'repeat'
          ? spec.item
          : spec.kind === 'locList'
            ? { kind: 'loc', name: '', label: spec.itemLabel, multiline: spec.multiline, required: true }
            : { kind: 'text', name: '', label: spec.itemLabel, dir: 'ltr', required: true };
      const move = (from: number, to: number) => {
        const next = [...list];
        const [x] = next.splice(from, 1);
        next.splice(to, 0, x);
        ctx.set(path, next);
      };
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[13px] font-medium text-ink-3">
            {spec.label}
            {spec.required ? <span className="text-danger"> *</span> : null}
          </div>
          {spec.hint && <p className="m-0 text-[12px] text-faint">{spec.hint}</p>}
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {list.map((_, i) => (
              <li key={i} className="rounded-lg border border-line bg-canvas/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-muted">
                    {spec.itemLabel} {i + 1}
                  </span>
                  <span className="flex gap-1">
                    <IconButton label={t('website.moveUp')} disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowUp size={15} />
                    </IconButton>
                    <IconButton
                      label={t('website.moveDown')}
                      disabled={i === list.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown size={15} />
                    </IconButton>
                    <IconButton
                      label={t('common.delete')}
                      onClick={() =>
                        ctx.set(
                          path,
                          list.filter((__, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </span>
                </div>
                <FieldView
                  spec={{ ...item, label: item.kind === 'group' ? '' : item.label }}
                  path={[...path, i]}
                  ctx={ctx}
                />
              </li>
            ))}
          </ol>
          <div>
            <button
              type="button"
              className={buttonClass('secondary', 'sm')}
              onClick={() => ctx.set(path, [...list, blank(item)])}
            >
              <Plus size={15} aria-hidden="true" />
              {t('website.add')} {spec.itemLabel}
            </button>
          </div>
          <ErrorLine path={path} />
        </div>
      );
    }
  }
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-muted hover:bg-ink/6 hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function LocField({
  spec,
  path,
  value,
  set,
}: {
  spec: Extract<FieldSpec, { kind: 'loc' }>;
  path: Path;
  value: unknown;
  set: Ctx['set'];
}) {
  const v = (value ?? {}) as { ar?: string; en?: string };
  const Control = spec.multiline ? 'textarea' : 'input';
  return (
    <div className="flex flex-col gap-1.5">
      {spec.label && (
        <div className="text-[13px] font-medium text-ink-3">
          {spec.label}
          {spec.required ? <span className="text-danger"> *</span> : null}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {(['ar', 'en'] as const).map((lang) => (
          <Field
            key={lang}
            label={lang === 'ar' ? 'العربية' : 'English'}
            name={join([...path, lang])}
            className="[&>label]:text-[11.5px] [&>label]:font-normal [&>label]:text-faint"
          >
            {({ id, ...aria }) => (
              <Control
                id={id}
                {...aria}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                aria-label={
                  spec.label ? `${spec.label} — ${lang === 'ar' ? 'العربية' : 'English'}` : undefined
                }
                rows={spec.multiline ? 4 : undefined}
                className="field-input"
                value={v[lang] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  set([...path, lang], e.target.value)
                }
              />
            )}
          </Field>
        ))}
      </div>
      {spec.hint && <p className="m-0 text-[12px] text-faint">{spec.hint}</p>}
    </div>
  );
}

function ImageField({
  label,
  path,
  value,
  ctx,
  required,
}: {
  label: string;
  path: Path;
  value: unknown;
  ctx: Ctx;
  required?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const img = (value ?? {}) as { src?: string; credit?: string; creditUrl?: string };
  const preview = img.src ? imagePreviewUrl(img.src, ctx.siteUrl) : null;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="text-[13px] font-medium text-ink-3">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={22} className="text-faint" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass('secondary', 'sm')} onClick={() => setOpen(true)}>
              {t('website.pickImage')}
            </button>
          </div>
          <Field
            label={t('website.imageLink')}
            name={join([...path, 'src'])}
            hint={t('website.imageLinkHint')}
          >
            {({ id, ...aria }) => (
              <input
                id={id}
                {...aria}
                dir="ltr"
                className="field-input"
                value={img.src ?? ''}
                onChange={(e) => ctx.set([...path, 'src'], e.target.value.trim())}
              />
            )}
          </Field>
        </div>
      </div>
      <LocField
        spec={{ kind: 'loc', name: 'alt', label: t('website.imageAlt'), required: true }}
        path={[...path, 'alt']}
        value={getAt(ctx.value, [...path, 'alt'])}
        set={ctx.set}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field label={t('website.imageCredit')} name={join([...path, 'credit'])}>
          {({ id, ...aria }) => (
            <input
              id={id}
              {...aria}
              dir="ltr"
              className="field-input"
              value={img.credit ?? ''}
              onChange={(e) => ctx.set([...path, 'credit'], e.target.value)}
            />
          )}
        </Field>
        <Field label={t('website.imageCreditUrl')} name={join([...path, 'creditUrl'])}>
          {({ id, ...aria }) => (
            <input
              id={id}
              {...aria}
              dir="ltr"
              className="field-input"
              value={img.creditUrl ?? ''}
              onChange={(e) => ctx.set([...path, 'creditUrl'], e.target.value.trim())}
            />
          )}
        </Field>
      </div>
      {open && (
        <MediaPicker
          media={ctx.media}
          onClose={() => setOpen(false)}
          onPick={(src) => {
            ctx.set([...path, 'src'], src);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
