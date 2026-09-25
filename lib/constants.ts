export const travelStyles = ['adventure', 'discovery', 'family', 'romance', 'unwind', 'luxury'] as const;
export type TravelStyle = (typeof travelStyles)[number];

/** Icons editors can pick in the CMS (mapped to Lucide icons in components/ui/Icon.tsx). */
export const iconNames = [
  'plane',
  'hotel',
  'passport',
  'car',
  'map',
  'heart',
  'compass',
  'users',
  'shield',
  'clock',
  'wallet',
  'headset',
  'star',
  'check',
  'sun',
  'globe',
  'camera',
  'briefcase',
  'message',
  'building',
] as const;
export type IconName = (typeof iconNames)[number];

export const departureStatuses = ['available', 'limited', 'soldout', 'request'] as const;
export type DepartureStatus = (typeof departureStatuses)[number];

export const visaStatuses = ['visa-free', 'on-arrival', 'e-visa', 'visa-required'] as const;
export type VisaStatus = (typeof visaStatuses)[number];

export const reviewSources = ['google', 'whatsapp', 'instagram', 'facebook', 'other'] as const;
