import { isLatin } from './En';

/** Section kicker: a short gold/bronze line plus a label (Arabic or Latin, styled accordingly). */
export function Eyebrow({
  children,
  tone = 'bronze',
  line = 36,
  className = '',
}: {
  children: string;
  tone?: 'bronze' | 'gold' | 'ink';
  line?: number;
  className?: string;
}) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'ink' ? 'text-ink-2' : 'text-bronze';
  const bg = tone === 'gold' ? 'bg-gold' : tone === 'ink' ? 'bg-ink-2' : 'bg-bronze';
  const latin = isLatin(children);
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <span className={`h-px shrink-0 ${bg}`} style={{ width: line }} aria-hidden="true" />
      <span {...(latin ? { lang: 'en', dir: 'ltr' as const } : {})} className={`eyebrow ${color}`}>
        {children}
      </span>
    </div>
  );
}
