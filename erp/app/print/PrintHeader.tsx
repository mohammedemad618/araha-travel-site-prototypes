import type { Branch, Tenant } from '@/lib/types';

export function PrintHeader({
  tenant,
  branch,
  title,
  number,
  date,
}: {
  tenant: Tenant;
  /** Shown under the company name when the company has several branches. */
  branch?: Branch;
  title: string;
  number: string;
  date: string;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-ink pb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rotate-45"
            style={{ background: tenant.settings.accent }}
            aria-hidden="true"
          />
          <span className="text-[22px] font-semibold">{tenant.name}</span>
        </div>
        {branch && <div className="mt-1 text-[13.5px] font-medium">{branch.name}</div>}
        {(branch?.address || tenant.settings.address) && (
          <div className="mt-1 text-[13px] text-muted">{branch?.address || tenant.settings.address}</div>
        )}
        {(branch?.phone || tenant.settings.phone) && (
          <div className="font-latin text-[13px] text-muted" dir="ltr">
            {branch?.phone || tenant.settings.phone}
          </div>
        )}
      </div>
      <div className="text-end">
        <div className="text-[20px] font-semibold">{title}</div>
        <div className="font-latin text-[15px]">{number}</div>
        <div className="text-[13px] text-muted">{date}</div>
      </div>
    </header>
  );
}

/** The branch to print on a document, when the company has more than one. */
export function printBranch(
  ctx: { allBranches: Branch[] },
  id: { toString(): string } | undefined,
): Branch | undefined {
  if (ctx.allBranches.length < 2 || !id) return undefined;
  return ctx.allBranches.find((b) => String(b._id) === String(id));
}
