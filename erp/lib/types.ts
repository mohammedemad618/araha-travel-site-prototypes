import type { ObjectId } from 'mongodb';
import type { Role } from './rbac';

// Business dates (travel, payment, due) are stored as YYYY-MM-DD strings so they
// never shift with time zones; timestamps (createdAt, …) are real Dates.
export type ISODate = string;
export type Currency = 'IQD' | 'USD';

export type TenantSettings = {
  currency: Currency;
  /** Iraqi dinars per one US dollar, used to convert payments and costs. */
  usdRate: number;
  accent: string;
  bookingPrefix: string;
  receiptPrefix: string;
  phone?: string;
  address?: string;
  invoiceFooter?: string;
};

export type TenantWebsite = {
  /** Public key the website sends with lead requests. Safe to expose. */
  apiKey: string;
  allowedOrigins: string[];
  siteUrl?: string;
  /** Secret Netlify build hook used to republish the website. */
  buildHookUrl?: string;
  lastPublishedAt?: Date;
};

export type Tenant = {
  _id: ObjectId;
  slug: string;
  name: string;
  plan: 'trial' | 'basic' | 'pro';
  status: 'active' | 'suspended';
  settings: TenantSettings;
  website: TenantWebsite;
  createdAt: Date;
};

export type User = {
  _id: ObjectId;
  tenantId: ObjectId | null;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  mustChangePassword: boolean;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
};

export type Session = {
  _id: ObjectId;
  tokenHash: string;
  userId: ObjectId;
  /** For platform admins working inside a tenant. */
  activeTenantId?: ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

export const leadSources = [
  'website',
  'whatsapp',
  'phone',
  'walk_in',
  'referral',
  'social',
  'other',
] as const;
export type LeadSource = (typeof leadSources)[number];
export const leadStages = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
export type LeadStage = (typeof leadStages)[number];

export type Lead = {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  formType?: string;
  stage: LeadStage;
  lostReason?: string;
  interest: {
    destination?: string;
    packageSlug?: string;
    packageTitle?: string;
    departure?: string;
    travellers?: string;
    budget?: string;
    when?: string;
  };
  message?: string;
  value?: number;
  assignedTo?: ObjectId;
  customerId?: ObjectId;
  bookingId?: ObjectId;
  nextFollowUp?: ISODate;
  createdAt: Date;
  updatedAt: Date;
};

export type Traveller = {
  _id: ObjectId;
  name: string;
  nameEn?: string;
  relation?: string;
  birthDate?: ISODate;
  gender?: 'm' | 'f';
  passportNo?: string;
  passportExpiry?: ISODate;
  nationality?: string;
};

export type Customer = {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  phone: string;
  phone2?: string;
  email?: string;
  city?: string;
  notes?: string;
  tags: string[];
  source?: LeadSource;
  travellers: Traveller[];
  createdAt: Date;
  updatedAt: Date;
};

export type TravelPackage = {
  _id: ObjectId;
  tenantId: ObjectId;
  slug: string;
  title: string;
  titleEn?: string;
  destination: string;
  days: number;
  nights: number;
  currency: Currency;
  price: number;
  childPrice?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Departure = {
  _id: ObjectId;
  tenantId: ObjectId;
  packageId: ObjectId;
  date: ISODate;
  capacity: number;
  /** Overrides the package price for this date. */
  price?: number;
  closed: boolean;
  notes?: string;
  createdAt: Date;
};

export const bookingTypes = ['package', 'custom', 'flight', 'hotel', 'visa', 'other'] as const;
export type BookingType = (typeof bookingTypes)[number];
export const bookingStatuses = ['draft', 'confirmed', 'completed', 'cancelled'] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export type BookingItem = { _id: ObjectId; description: string; qty: number; unitPrice: number };
export type BookingCost = {
  _id: ObjectId;
  supplierId?: ObjectId;
  description: string;
  amount: number;
  currency: Currency;
  /** The cost converted into the booking currency at the rate of the day. */
  amountInBooking: number;
};

export type Booking = {
  _id: ObjectId;
  tenantId: ObjectId;
  number: string;
  customerId: ObjectId;
  leadId?: ObjectId;
  type: BookingType;
  title: string;
  packageId?: ObjectId;
  departureId?: ObjectId;
  travelDate?: ISODate;
  returnDate?: ISODate;
  adults: number;
  children: number;
  travellerIds: ObjectId[];
  status: BookingStatus;
  currency: Currency;
  items: BookingItem[];
  discount: number;
  total: number;
  costs: BookingCost[];
  costTotal: number;
  paid: number;
  assignedTo?: ObjectId;
  notes?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const paymentMethods = ['cash', 'bank_transfer', 'zaincash', 'fastpay', 'card', 'other'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export type Payment = {
  _id: ObjectId;
  tenantId: ObjectId;
  number: string;
  bookingId: ObjectId;
  customerId: ObjectId;
  kind: 'payment' | 'refund';
  amount: number;
  currency: Currency;
  amountInBooking: number;
  method: PaymentMethod;
  date: ISODate;
  reference?: string;
  notes?: string;
  voided: boolean;
  receivedBy: ObjectId;
  createdAt: Date;
};

export const supplierTypes = ['hotel', 'airline', 'ground', 'visa', 'insurance', 'other'] as const;
export type SupplierType = (typeof supplierTypes)[number];

export type Supplier = {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  type: SupplierType;
  contactName?: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
  createdAt: Date;
};

export type SupplierPayment = {
  _id: ObjectId;
  tenantId: ObjectId;
  supplierId: ObjectId;
  amount: number;
  currency: Currency;
  date: ISODate;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy: ObjectId;
  createdAt: Date;
};

export const visaStatuses = [
  'collecting',
  'submitted',
  'approved',
  'issued',
  'rejected',
  'cancelled',
] as const;
export type VisaStatus = (typeof visaStatuses)[number];

export type VisaApplication = {
  _id: ObjectId;
  tenantId: ObjectId;
  customerId: ObjectId;
  travellerId?: ObjectId;
  travellerName: string;
  bookingId?: ObjectId;
  country: string;
  visaType?: string;
  status: VisaStatus;
  submittedAt?: ISODate;
  expectedAt?: ISODate;
  decisionAt?: ISODate;
  reference?: string;
  notes?: string;
  assignedTo?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const entityTypes = ['lead', 'customer', 'booking', 'visa', 'supplier'] as const;
export type EntityType = (typeof entityTypes)[number];
export type EntityRef = { type: EntityType; id: ObjectId };

export type Task = {
  _id: ObjectId;
  tenantId: ObjectId;
  title: string;
  dueDate?: ISODate;
  done: boolean;
  doneAt?: Date;
  assignedTo?: ObjectId;
  related?: EntityRef;
  createdBy: ObjectId;
  createdAt: Date;
};

export const activityKinds = ['note', 'call', 'whatsapp', 'meeting', 'system'] as const;
export type ActivityKind = (typeof activityKinds)[number];

export type Activity = {
  _id: ObjectId;
  tenantId: ObjectId;
  entity: EntityRef;
  kind: ActivityKind;
  text: string;
  userId?: ObjectId;
  createdAt: Date;
};

export type AuditLog = {
  _id: ObjectId;
  tenantId: ObjectId | null;
  userId?: ObjectId;
  action: string;
  entity?: string;
  entityId?: ObjectId;
  summary: string;
  at: Date;
};
