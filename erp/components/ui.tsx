import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

// Presentational building blocks shared by every page (server-safe, no hooks).

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md';

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra = ''): string {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55';
  const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-[14px]' };
  const variants: Record<Variant, string> = {
    primary: 'bg-ink text-white hover:bg-ink-3',
    accent: 'bg-[var(--accent)] text-ink hover:brightness-95',
    secondary: 'border border-line-2 bg-surface text-ink hover:bg-canvas',
    ghost: 'text-ink hover:bg-ink/5',
    danger: 'border border-danger/30 bg-surface text-danger hover:bg-danger-bg',
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`;
}

export function LinkButton({
  href,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  children,
  className = '',
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  intro,
  actions,
  back,
}: {
  title: React.ReactNode;
  intro?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-[13px] text-muted hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="m-0 text-[24px] leading-tight font-semibold text-ink">{title}</h1>
        {intro && <p className="m-0 mt-1.5 text-[14px] text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className = '',
  padded = true,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="m-0 text-[15px] font-semibold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink/6 text-ink-3',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  gold: 'bg-sand text-bronze',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
}) {
  const body = (
    <div className="card flex h-full flex-col gap-2 p-4 transition-colors hover:border-line-2">
      <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
        <span>{label}</span>
        {Icon && <Icon size={17} strokeWidth={1.6} className="text-bronze" aria-hidden="true" />}
      </div>
      <div className="num text-[20px] leading-tight font-semibold whitespace-normal sm:text-[22px]">
        {value}
      </div>
      {hint && <div className="text-[12.5px] text-faint">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-bronze">
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
        </span>
      )}
      <p className="m-0 text-[15px] font-medium">{title}</p>
      {body && <p className="m-0 max-w-md text-[13.5px] text-muted">{body}</p>}
      {action}
    </div>
  );
}

/** Label/value pairs. */
export function DL({ items, cols = 2 }: { items: [string, React.ReactNode][]; cols?: 1 | 2 | 3 }) {
  const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[cols];
  return (
    <dl className={`m-0 grid grid-cols-1 gap-x-6 gap-y-4 ${grid}`}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="mb-0.5 text-[12.5px] text-muted">{k}</dt>
          <dd className="m-0 break-words">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="data-table">{children}</table>
    </div>
  );
}

/** GET-based tab links that preserve nothing but their own query. */
export function Tabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-line" aria-label="tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-[14px] text-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="num rounded-full bg-ink/6 px-1.5 text-[11.5px] text-muted">{tab.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
