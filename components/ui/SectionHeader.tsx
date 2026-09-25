import { Eyebrow } from './Eyebrow';

export function SectionHeader({
  eyebrow,
  title,
  intro,
  dark = false,
  action,
  className = '',
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  dark?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-reveal
      className={`mb-[clamp(40px,5vw,72px)] flex flex-wrap items-end justify-between gap-7 ${className}`}
    >
      <div>
        <Eyebrow tone={dark ? 'gold' : 'bronze'} className="mb-5.5">
          {eyebrow}
        </Eyebrow>
        <h2 className={`heading-xl m-0 ${dark ? 'text-ivory' : 'text-ink'}`}>{title}</h2>
      </div>
      {intro && (
        <p className={`m-0 max-w-[340px] text-[17px] leading-[1.8] ${dark ? 'text-fog' : 'text-muted'}`}>
          {intro}
        </p>
      )}
      {action}
    </div>
  );
}
