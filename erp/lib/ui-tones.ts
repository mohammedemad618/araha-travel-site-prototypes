import type { Tone } from '@/components/ui';
import type { BookingStatus, LeadStage, QuoteStatus, ServiceStatus, VisaStatus } from './types';

export const STAGE_TONE: Record<LeadStage, Tone> = {
  new: 'info',
  contacted: 'gold',
  quoted: 'warning',
  won: 'success',
  lost: 'neutral',
};

export const BOOKING_TONE: Record<BookingStatus, Tone> = {
  draft: 'neutral',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
};

export const VISA_TONE: Record<VisaStatus, Tone> = {
  collecting: 'neutral',
  submitted: 'info',
  approved: 'gold',
  issued: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const PAY_TONE: Record<'unpaid' | 'partial' | 'paidFull', Tone> = {
  unpaid: 'danger',
  partial: 'warning',
  paidFull: 'success',
};

export const SERVICE_TONE: Record<ServiceStatus, Tone> = {
  pending: 'neutral',
  requested: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
};

export const QUOTE_TONE: Record<QuoteStatus | 'expired', Tone> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
};
