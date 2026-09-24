export function Eyebrow({
  children,
  tone = 'bronze',
  line = 36,
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'bronze' | 'gold' | 'ink';
  line?: number;
  className?: string;
}) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'ink' ? 'text-ink-2' : 'text-bronze';
  const bg = tone === 'gold' ? 'bg-gold' : tone === 'ink' ? 'bg-ink-2' : 'bg-bronze';
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <span className={`h-px ${bg}`} style={{ width: line }} aria-hidden="true" />
      <span dir="ltr" className={`eyebrow ${color}`}>
        {children}
      </span>
    </div>
  );
}
