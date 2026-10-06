/** Normalises Iraqi numbers to +964XXXXXXXXXX; other numbers keep their digits. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^\d+]/g, '');
  if (/^07\d{9}$/.test(digits)) return `+964${digits.slice(1)}`;
  if (/^7\d{9}$/.test(digits)) return `+964${digits}`;
  if (/^00964\d{10}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^964\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  return digits;
}

export function isValidPhone(input: string): boolean {
  return /^\+\d{8,15}$/.test(normalizePhone(input));
}

/** wa.me link for a stored number. */
export function waLink(phone: string, text?: string): string {
  const n = normalizePhone(phone).replace(/^\+/, '');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
