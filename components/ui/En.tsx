/** Marks a Latin-script fragment inside Arabic text so screen readers switch voice (WCAG 3.1.2). */
export function En({
  children,
  className,
  block = false,
}: {
  children: React.ReactNode;
  className?: string;
  block?: boolean;
}) {
  const Tag = block ? 'div' : 'span';
  return (
    <Tag lang="en" dir="ltr" className={className} style={block ? undefined : { unicodeBidi: 'isolate' }}>
      {children}
    </Tag>
  );
}

const LATIN = /^[\u0000-ɏ -⁯°\s]+$/;
export const isLatin = (text: string) => LATIN.test(text);
