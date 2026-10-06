import type { ServiceLine } from '@/lib/types';

/** A priced line on a printed document; services also show their dates and details. */
export type PrintLine = Pick<ServiceLine, 'description' | 'qty' | 'unitPrice'> &
  Partial<Pick<ServiceLine, 'details' | 'startDate' | 'endDate'>> & { key: string };

export function PrintLines({
  lines,
  money,
  labels,
  dateLabel,
}: {
  lines: PrintLine[];
  money: (v: number) => string;
  labels: { description: string; qty: string; unitPrice: string; lineTotal: string };
  dateLabel?: (l: PrintLine) => string;
}) {
  return (
    <table className="data-table mb-6">
      <thead>
        <tr>
          <th>{labels.description}</th>
          <th>{labels.qty}</th>
          <th>{labels.unitPrice}</th>
          <th>{labels.lineTotal}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => {
          const when = dateLabel?.(l);
          return (
            <tr key={l.key}>
              <td>
                <div>{l.description}</div>
                {(when || l.details) && (
                  <div className="text-[12px] text-muted">
                    {[when, l.details].filter(Boolean).join(' · ')}
                  </div>
                )}
              </td>
              <td className="num">{l.qty}</td>
              <td className="num">{money(l.unitPrice)}</td>
              <td className="num">{money(l.qty * l.unitPrice)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-line py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
