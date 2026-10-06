'use client';

import { useState } from 'react';

type Datum = { key: string; label: string; value: number; display: string };

/**
 * Single-series column chart: one ink hue, thin bars with 4px rounded tops on a
 * faint baseline, a hover/focus tooltip per bar, and a visually hidden table
 * with the same numbers for screen readers.
 */
export function BarChart({ data, title, height = 180 }: { data: Datum[]; title: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.findIndex((d) => d.value === max);
  const width = 100 / data.length;

  return (
    <figure className="m-0">
      <div className="relative" style={{ height }} aria-hidden="true">
        {/* Recessive grid: baseline plus a mid line. */}
        <div className="absolute inset-x-0 bottom-6 border-t border-line" />
        <div
          className="absolute inset-x-0 border-t border-dashed border-line/70"
          style={{ bottom: `calc(24px + ${(height - 48) / 2}px)` }}
        />
        <div className="absolute inset-x-0 top-0 bottom-6 flex items-end">
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, (d.value / max) * (height - 48)) : 0;
            const showLabel = i === peak || i === data.length - 1;
            return (
              <div
                key={d.key}
                className="relative flex h-full flex-col items-center justify-end"
                style={{ width: `${width}%` }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {showLabel && d.value > 0 && active === null && (
                  <span className="num mb-1 text-[11.5px] whitespace-nowrap text-muted">{d.display}</span>
                )}
                {active === i && (
                  <span
                    className="num absolute z-10 rounded-md bg-ink px-2 py-1 text-[12px] whitespace-nowrap text-white shadow"
                    style={{ bottom: h + 8 }}
                  >
                    {d.label}: {d.display}
                  </span>
                )}
                <span
                  className={`block w-[38%] max-w-[34px] min-w-[10px] rounded-t-[4px] transition-colors ${active === i ? 'bg-[var(--accent)]' : 'bg-ink'}`}
                  style={{ height: h }}
                />
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex">
          {data.map((d) => (
            <span key={d.key} className="text-center text-[11.5px] text-muted" style={{ width: `${width}%` }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{d.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
