'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/client';
import { Field } from './form';

type Option = { id: string; name: string; phone: string };

/** Accessible combobox that searches customers as you type. */
export function CustomerPicker({
  name,
  label,
  initial,
  onSelect,
}: {
  name: string;
  label: string;
  initial?: Option;
  onSelect?: (o: Option | undefined) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initial ? initial.name : '');
  const [value, setValue] = useState<Option | undefined>(initial);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/lookup/customers?q=${encodeURIComponent(query)}`);
      if (res.ok) setOptions(await res.json());
      setActive(0);
    }, 180);
    return () => clearTimeout(timer.current);
  }, [query, open]);

  const choose = (o: Option) => {
    setValue(o);
    setQuery(o.name);
    setOpen(false);
    onSelect?.(o);
  };

  return (
    <Field label={label} name={name} required>
      {(p) => (
        <div className="relative">
          <input type="hidden" name={name} value={value?.id ?? ''} />
          <input
            id={p.id}
            aria-invalid={p['aria-invalid']}
            aria-describedby={p['aria-describedby']}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            className="field-input"
            value={query}
            placeholder={t('common.searchPlaceholder')}
            onChange={(e) => {
              setQuery(e.target.value);
              if (value) onSelect?.(undefined);
              setValue(undefined);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, options.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && open && options[active]) {
                e.preventDefault();
                choose(options[active]!);
              } else if (e.key === 'Escape') setOpen(false);
            }}
          />
          {open && options.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg"
            >
              {options.map((o, i) => (
                <li
                  key={o.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 aria-selected:bg-canvas"
                >
                  <span>{o.name}</span>
                  <span className="font-latin text-[12.5px] text-muted" dir="ltr">
                    {o.phone}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}
