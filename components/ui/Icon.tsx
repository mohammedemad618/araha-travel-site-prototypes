import {
  Banknote,
  BedDouble,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Car,
  Check,
  Clock,
  Compass,
  Globe,
  Headset,
  Heart,
  Hotel,
  Languages,
  Map,
  MessageCircle,
  Plane,
  Route,
  ShieldCheck,
  Stamp,
  Star,
  Sun,
  Timer,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { IconName } from '@/lib/constants';

const ICONS: Record<IconName | 'route' | 'bed' | 'calendar' | 'languages' | 'money' | 'timer', LucideIcon> = {
  plane: Plane,
  hotel: Hotel,
  passport: Stamp,
  car: Car,
  map: Map,
  heart: Heart,
  compass: Compass,
  users: Users,
  shield: ShieldCheck,
  clock: Clock,
  wallet: Wallet,
  headset: Headset,
  star: Star,
  check: Check,
  sun: Sun,
  globe: Globe,
  camera: Camera,
  briefcase: Briefcase,
  message: MessageCircle,
  building: Building2,
  route: Route,
  bed: BedDouble,
  calendar: CalendarDays,
  languages: Languages,
  money: Banknote,
  timer: Timer,
};

export type AnyIconName = keyof typeof ICONS;

/** Thin-stroke icon that inherits the text colour. Decorative by default. */
export function Icon({
  name,
  size = 20,
  className = '',
  label,
}: {
  name: AnyIconName;
  size?: number;
  className?: string;
  label?: string;
}) {
  const Cmp = ICONS[name];
  return (
    <Cmp
      size={size}
      strokeWidth={1.5}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}

// Brand glyphs live in their own module so client components can use them
// without pulling the whole Lucide map into the browser bundle.
export { WhatsAppGlyph, InstagramGlyph, FacebookGlyph, TikTokGlyph } from './Glyphs';
