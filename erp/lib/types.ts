import type { ObjectId } from 'mongodb';
import type { TenantRole } from './rbac';

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
  quotePrefix?: string;
  invoicePrefix?: string;
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
  /** Last time website content was edited in the back office (compared with lastPublishedAt). */
  contentUpdatedAt?: Date;
};

export type Tenant = {
  _id: ObjectId;
  slug: string;
  name: string;
  plan: 'trial' | 'basic' | 'pro';
  status: 'active' | 'suspended';
  settings: TenantSettings;
  website: TenantWebsite;
  /** Set once the ledger has its chart of accounts and every past record posted. */
  accounting?: { readyAt?: Date; lockedAt?: Date };
  createdAt: Date;
};

/** A login. What the person may do in each company is held by their memberships. */
export type User = {
  _id: ObjectId;
  email: string;
  name: string;
  /** Niura staff who manage the platform (and can enter any company for support). */
  platformAdmin?: boolean;
  passwordHash: string;
  mustChangePassword: boolean;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
};

/**
 * Which records a member sees: the whole company, only their branches, or only
 * records assigned to (or created by) them.
 */
export const memberScopes = ['all', 'branch', 'own'] as const;
export type MemberScope = (typeof memberScopes)[number];

/** A user's place in one company. One user can belong to several companies. */
export type Membership = {
  _id: ObjectId;
  userId: ObjectId;
  tenantId: ObjectId;
  role: TenantRole;
  scope: MemberScope;
  /** Branches the member works in. Empty means every branch (scope "all" or "own"). */
  branchIds: ObjectId[];
  active: boolean;
  createdAt: Date;
};

export type Branch = {
  _id: ObjectId;
  tenantId: ObjectId;
  name: string;
  /** Short code shown in lists, e.g. MSL. */
  code: string;
  phone?: string;
  address?: string;
  isMain: boolean;
  active: boolean;
  createdAt: Date;
};

export type Session = {
  _id: ObjectId;
  tokenHash: string;
  userId: ObjectId;
  /** The company the user is working in (members of several companies switch between them). */
  activeTenantId?: ObjectId;
  /** Optional branch the lists are narrowed to. */
  branchFilter?: ObjectId;
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
  branchId: ObjectId;
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
  createdBy?: ObjectId;
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

export const serviceTypes = [
  'package',
  'flight',
  'hotel',
  'visa',
  'transfer',
  'tour',
  'insurance',
  'other',
] as const;
export type ServiceType = (typeof serviceTypes)[number];
export const serviceStatuses = ['pending', 'requested', 'confirmed', 'cancelled'] as const;
export type ServiceStatus = (typeof serviceStatuses)[number];

/**
 * One part of a trip (a flight, a hotel stay, a visa…): what the customer pays
 * for it, what the supplier charges, and where it stands with the supplier.
 * Used by bookings (services) and quotations (lines).
 */
export type ServiceLine = {
  _id: ObjectId;
  type: ServiceType;
  description: string;
  /** Flight number, room type, pick-up point… */
  details?: string;
  startDate?: ISODate;
  endDate?: ISODate;
  qty: number;
  /** Sale price per unit, in the booking currency. */
  unitPrice: number;
  supplierId?: ObjectId;
  /** Supplier cost (total for the line) in its own currency. */
  cost?: number;
  costCurrency?: Currency;
  /** The cost converted into the booking currency at the rate of the day. */
  costInBooking?: number;
  status: ServiceStatus;
  /** Supplier reference: PNR, hotel confirmation number… */
  confirmation?: string;
};

export type Booking = {
  _id: ObjectId;
  tenantId: ObjectId;
  branchId: ObjectId;
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
  services: ServiceLine[];
  discount: number;
  total: number;
  costTotal: number;
  paid: number;
  /** The quotation this booking was made from. */
  quoteId?: ObjectId;
  /**
   * What the ledger already holds for this booking, in the booking currency:
   * revenue, and supplier cost per supplier ("none" for costs without one).
   * Changes are posted as the difference, so edits never double-count.
   */
  ledger?: { version: number; revenue: number; costs: Record<string, number> };
  assignedTo?: ObjectId;
  notes?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const quoteStatuses = ['draft', 'sent', 'accepted', 'rejected'] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];

/** A priced offer sent to a customer; accepting it creates a booking. */
export type Quote = {
  _id: ObjectId;
  tenantId: ObjectId;
  branchId: ObjectId;
  number: string;
  customerId: ObjectId;
  leadId?: ObjectId;
  title: string;
  travelDate?: ISODate;
  returnDate?: ISODate;
  adults: number;
  children: number;
  currency: Currency;
  lines: ServiceLine[];
  discount: number;
  total: number;
  costTotal: number;
  validUntil?: ISODate;
  status: QuoteStatus;
  sentAt?: Date;
  notes?: string;
  bookingId?: ObjectId;
  assignedTo?: ObjectId;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * An issued invoice: a numbered, fixed copy of a booking's sale lines. Payments
 * stay on the booking; voiding keeps the number for the record.
 */
export type Invoice = {
  _id: ObjectId;
  tenantId: ObjectId;
  branchId: ObjectId;
  number: string;
  bookingId: ObjectId;
  customerId: ObjectId;
  customer: { name: string; phone: string };
  date: ISODate;
  dueDate?: ISODate;
  currency: Currency;
  lines: { description: string; qty: number; unitPrice: number }[];
  discount: number;
  total: number;
  status: 'issued' | 'void';
  voidReason?: string;
  voidedAt?: Date;
  createdBy: ObjectId;
  createdAt: Date;
};

export const paymentMethods = ['cash', 'bank_transfer', 'zaincash', 'fastpay', 'card', 'other'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export type Payment = {
  _id: ObjectId;
  tenantId: ObjectId;
  branchId: ObjectId;
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
  branchId: ObjectId;
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
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const entityTypes = ['lead', 'customer', 'booking', 'visa', 'supplier', 'quote'] as const;
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

export const accountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
export type AccountType = (typeof accountTypes)[number];

/** System accounts the automatic entries post to. */
export const accountKeys = [
  'cash',
  'bank',
  'wallet',
  'receivable',
  'payable',
  'capital',
  'retained',
  'sales',
  'cogs',
  'expenses',
] as const;
export type AccountKey = (typeof accountKeys)[number];

export type Account = {
  _id: ObjectId;
  tenantId: ObjectId;
  code: string;
  name: string;
  type: AccountType;
  /** Set for system accounts used by automatic entries; they cannot be closed. */
  key?: AccountKey;
  /** Shown in the "paid from" lists for expenses and transfers. */
  isCash?: boolean;
  active: boolean;
  createdAt: Date;
};

export const journalSources = [
  'booking',
  'payment',
  'paymentVoid',
  'supplierPayment',
  'supplierPaymentVoid',
  'expense',
  'expenseVoid',
  'manual',
  'reversal',
] as const;
export type JournalSource = (typeof journalSources)[number];

/** Amounts are in the company currency, in minor units. */
export type JournalLine = {
  accountId: ObjectId;
  debit: number;
  credit: number;
  memo?: string;
  /** Who the line concerns, for statements (customer or supplier). */
  party?: { type: 'customer' | 'supplier'; id: ObjectId };
};

export type JournalEntry = {
  _id: ObjectId;
  tenantId: ObjectId;
  number: string;
  date: ISODate;
  memo: string;
  source: { type: JournalSource; id?: ObjectId; ref?: string };
  /** "payment:<id>" etc. for records posted once; a unique index rejects a second posting. */
  uniqueKey?: string;
  branchId?: ObjectId;
  lines: JournalLine[];
  total: number;
  /** Set on a manual entry that has been reversed, pointing at the reversal. */
  reversedBy?: ObjectId;
  reverses?: ObjectId;
  createdBy?: ObjectId;
  createdAt: Date;
};

export type Expense = {
  _id: ObjectId;
  tenantId: ObjectId;
  branchId: ObjectId;
  number: string;
  date: ISODate;
  accountId: ObjectId;
  /** The cash, bank or wallet account it was paid from. */
  paidFrom: ObjectId;
  amount: number;
  currency: Currency;
  amountBase: number;
  payee?: string;
  memo?: string;
  voided: boolean;
  createdBy: ObjectId;
  createdAt: Date;
};

/** Website content edited in the back office, one document per page (see lib/site-content). */
// Defined with the content schemas, which the website's tests also load.
import type { SiteContentKind } from './site-content';
export { siteContentKinds, type SiteContentKind } from './site-content';

export type SiteContent = {
  _id: ObjectId;
  tenantId: ObjectId;
  kind: SiteContentKind;
  /** The page's identifier on the website: package slug, visa destination or destination slug. */
  key: string;
  /** Shaped like the website's own content files. Images may point at the media library. */
  data: Record<string, unknown>;
  updatedAt: Date;
  updatedBy?: ObjectId;
};
