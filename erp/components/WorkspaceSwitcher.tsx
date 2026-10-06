'use client';

import { Building2, GitBranch } from 'lucide-react';

type Option = { value: string; label: string };

/** A select that applies as soon as it changes (company or branch). */
export function AutoSubmitSelect({
  action,
  name,
  label,
  value,
  options,
  back,
  icon,
}: {
  action: (fd: FormData) => Promise<void>;
  name: string;
  label: string;
  value: string;
  options: Option[];
  back?: string;
  icon: 'company' | 'branch';
}) {
  const Icon = icon === 'company' ? Building2 : GitBranch;
  return (
    <form action={action} className="relative">
      {back && <input type="hidden" name="back" value={back} />}
      <Icon
        size={15}
        aria-hidden="true"
        className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-faint"
      />
      <select
        name={name}
        aria-label={label}
        title={label}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field-input h-9 max-w-[170px] truncate ps-8 text-[13px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
