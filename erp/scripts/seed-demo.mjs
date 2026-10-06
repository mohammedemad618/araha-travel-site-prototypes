// Creates a demo travel company with realistic data, for sales demos and QA.
// Usage: MONGODB_URI=... node scripts/seed-demo.mjs [slug]
// Prints the demo owner's email and a fresh password. Safe to re-run: the demo
// company (and only it) is replaced each time.
import { MongoClient, ObjectId } from 'mongodb';
import { randomBytes, scryptSync } from 'node:crypto';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Set MONGODB_URI first.');
  process.exit(1);
}
const slug = process.argv[2] || 'demo';
const client = await MongoClient.connect(uri, { ignoreUndefined: true });
const db = client.db(process.env.MONGODB_DB || 'niura_erp');

function hash(pw) {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${key.toString('base64')}`;
}
const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ago = (days) => new Date(Date.now() - days * 86400_000);
const pick = (arr, i) => arr[i % arr.length];

// Remove a previous demo company and everything it owns.
const old = await db.collection('tenants').findOne({ slug });
if (old) {
  for (const c of [
    'memberships',
    'branches',
    'quotes',
    'invoices',
    'accounts',
    'journalEntries',
    'expenses',
    'leads',
    'customers',
    'packages',
    'departures',
    'bookings',
    'payments',
    'suppliers',
    'supplierPayments',
    'visas',
    'tasks',
    'activities',
    'auditLogs',
  ])
    await db.collection(c).deleteMany({ tenantId: old._id });
  await db.collection('tenants').deleteOne({ _id: old._id });
}

const tenantId = new ObjectId();
await db.collection('tenants').insertOne({
  _id: tenantId,
  slug,
  name: 'سفريات الرافدين (تجريبي)',
  plan: 'pro',
  status: 'active',
  settings: {
    currency: 'IQD',
    usdRate: 1310,
    accent: '#c99755',
    bookingPrefix: 'RF',
    receiptPrefix: 'RC',
    phone: '+964 770 000 0000',
    address: 'الموصل، الجانب الأيسر',
    invoiceFooter: 'شكراً لاختياركم سفريات الرافدين.',
  },
  website: { apiKey: `pk_demo_${randomBytes(12).toString('hex')}`, allowedOrigins: [] },
  createdAt: ago(120),
});

const password = randomBytes(6).toString('base64url');
const staff = [
  { name: 'أحمد علي', email: `owner@${slug}.niura.iq`, role: 'owner' },
  { name: 'سارة محمود', email: `sales@${slug}.niura.iq`, role: 'sales' },
  { name: 'حسين كريم', email: `accounts@${slug}.niura.iq`, role: 'accountant' },
  { name: 'زينب عادل', email: `ops@${slug}.niura.iq`, role: 'operations' },
].map((s) => ({ _id: new ObjectId(), ...s }));
await db.collection('users').deleteMany({ email: { $in: staff.map((s) => s.email) } });
await db.collection('users').insertMany(
  staff.map((s) => ({
    _id: s._id,
    name: s.name,
    email: s.email,
    passwordHash: hash(password),
    mustChangePassword: false,
    active: true,
    createdAt: ago(110),
  })),
);
const [owner, sales, accounts, ops] = staff;

// Two branches: the main office and a second one, so branch reports have data.
const mainBranch = new ObjectId();
const secondBranch = new ObjectId();
await db.collection('branches').insertMany([
  {
    _id: mainBranch,
    tenantId,
    name: 'الموصل — الجانب الأيسر',
    code: 'MSL',
    phone: '+964 770 000 0000',
    address: 'الموصل، الجانب الأيسر',
    isMain: true,
    active: true,
    createdAt: ago(120),
  },
  {
    _id: secondBranch,
    tenantId,
    name: 'بغداد — الكرادة',
    code: 'BGD',
    phone: '+964 780 000 0000',
    address: 'بغداد، الكرادة',
    isMain: false,
    active: true,
    createdAt: ago(60),
  },
]);
await db.collection('memberships').insertMany(
  staff.map((s) => ({
    userId: s._id,
    tenantId,
    role: s.role,
    // The sales person works in the main branch only.
    scope: s.role === 'sales' ? 'branch' : 'all',
    branchIds: s.role === 'sales' ? [mainBranch] : [],
    active: true,
    createdAt: ago(110),
  })),
);

const packages = [
  {
    slug: 'enchanting-istanbul',
    title: 'إسطنبول الساحرة',
    destination: 'تركيا',
    days: 7,
    nights: 6,
    price: 875000,
    childPrice: 650000,
  },
  {
    slug: 'istanbul-and-trabzon',
    title: 'إسطنبول وطرابزون',
    destination: 'تركيا',
    days: 8,
    nights: 7,
    price: 1150000,
    childPrice: 850000,
  },
  {
    slug: 'tbilisi-and-batumi',
    title: 'تبليسي وباتومي',
    destination: 'جورجيا',
    days: 6,
    nights: 5,
    price: 790000,
    childPrice: 560000,
  },
  {
    slug: 'baku-and-gabala',
    title: 'باكو وقبالا',
    destination: 'أذربيجان',
    days: 6,
    nights: 5,
    price: 820000,
    childPrice: 600000,
  },
  {
    slug: 'modern-dubai',
    title: 'دبي العصرية',
    destination: 'الإمارات',
    days: 5,
    nights: 4,
    price: 1250000,
    childPrice: 900000,
  },
].map((p) => ({
  _id: new ObjectId(),
  tenantId,
  currency: 'IQD',
  active: true,
  createdAt: ago(100),
  updatedAt: ago(10),
  ...p,
}));
await db.collection('packages').insertMany(packages);

const departures = [];
packages.forEach((p, i) => {
  for (const offset of [-40, 12 + i * 3, 30 + i * 4, 55 + i * 5])
    departures.push({
      _id: new ObjectId(),
      tenantId,
      packageId: p._id,
      date: day(offset),
      capacity: 20,
      closed: false,
      createdAt: ago(90),
    });
});
await db.collection('departures').insertMany(departures);

const suppliers = [
  { name: 'فندق ريتشموند إسطنبول', type: 'hotel', country: 'تركيا' },
  { name: 'الخطوط الجوية العراقية', type: 'airline', country: 'العراق' },
  { name: 'فلاي بغداد', type: 'airline', country: 'العراق' },
  { name: 'جورجيا ترافل للنقل', type: 'ground', country: 'جورجيا' },
  { name: 'مكتب تأشيرات الإمارات', type: 'visa', country: 'الإمارات' },
].map((s) => ({ _id: new ObjectId(), tenantId, createdAt: ago(100), ...s }));
await db.collection('suppliers').insertMany(suppliers);

const names = [
  'محمد جاسم',
  'نور الهدى صالح',
  'علي حسين',
  'فاطمة كاظم',
  'عمر يونس',
  'رقية مهدي',
  'مصطفى نجم',
  'دعاء عبد الله',
  'حيدر سعدون',
  'آية فاضل',
  'يوسف طارق',
  'مريم سالم',
  'كرار عباس',
  'شهد ماجد',
  'إبراهيم خليل',
  'هبة رعد',
];
const kids = ['ليث', 'جنى', 'آدم', 'تيم', 'لين', 'ريان'];
const customers = names.map((name, i) => {
  const travellers = [
    {
      _id: new ObjectId(),
      name,
      relation: 'صاحب الحجز',
      passportNo: `A${(4500000 + i * 137).toString()}`,
      passportExpiry: i % 5 === 0 ? day(90) : day(900 + i * 20),
      nationality: 'عراقي',
    },
  ];
  if (i % 2 === 0)
    travellers.push({
      _id: new ObjectId(),
      name: `${pick(kids, i)} ${name.split(' ')[1]}`,
      relation: 'ابن/ابنة',
      birthDate: '2016-05-1' + (i % 9),
      passportNo: `A${(5600000 + i * 91).toString()}`,
      passportExpiry: day(1200),
      nationality: 'عراقي',
    });
  return {
    _id: new ObjectId(),
    tenantId,
    name,
    phone: `+96477${String(10000000 + i * 734521).slice(0, 8)}`,
    tags: i % 4 === 0 ? ['عائلة', 'VIP'] : i % 3 === 0 ? ['عائلة'] : [],
    source: pick(['website', 'whatsapp', 'walk_in', 'referral'], i),
    city: 'الموصل',
    travellers,
    createdAt: ago(100 - i * 5),
    updatedAt: ago(5),
  };
});
await db.collection('customers').insertMany(customers);

// Bookings across the last months, with payments and supplier costs.
const bookings = [];
const payments = [];
let seq = 0;
let rc = 0;
const year = new Date().getFullYear();
customers.slice(0, 13).forEach((c, i) => {
  const p = pick(packages, i);
  const futureDeps = departures.filter((d) => String(d.packageId) === String(p._id));
  const dep = i < 3 ? futureDeps[0] : futureDeps[1 + (i % 3)];
  const adults = 1 + (i % 3 === 0 ? 1 : 0);
  const children = c.travellers.length > 1 ? 1 : 0;
  const createdAt = ago(95 - i * 7);
  const status = dep.date < day(0) ? 'completed' : i % 6 === 5 ? 'draft' : 'confirmed';
  const paidShare = status === 'completed' ? 1 : status === 'draft' ? 0 : pick([1, 0.5, 0.3, 1], i);
  // The trip as separate services: the package sold to the customer, and the
  // flight and hotel bought from suppliers (their cost is inside the package price).
  const done = status !== 'draft';
  const services = [
    {
      _id: new ObjectId(),
      type: 'package',
      description: `${p.title} — البالغون`,
      startDate: dep.date,
      qty: adults,
      unitPrice: p.price,
      status: done ? 'confirmed' : 'pending',
    },
  ];
  if (children)
    services.push({
      _id: new ObjectId(),
      type: 'package',
      description: `${p.title} — الأطفال`,
      startDate: dep.date,
      qty: children,
      unitPrice: p.childPrice,
      status: done ? 'confirmed' : 'pending',
    });
  const total = services.reduce((s, x) => s + x.qty * x.unitPrice, 0);
  const flightCost = Math.round(total * 0.35);
  const hotelUsd = Math.round((total * 0.3) / 1310) * 100;
  services.push(
    {
      _id: new ObjectId(),
      type: 'flight',
      description: 'تذاكر الطيران ذهاباً وإياباً',
      details: 'EBL ↔ IST',
      startDate: dep.date,
      qty: adults + children,
      unitPrice: 0,
      supplierId: pick(suppliers, i % 2 ? 1 : 2)._id,
      cost: flightCost,
      costCurrency: 'IQD',
      costInBooking: flightCost,
      status: done ? 'confirmed' : 'pending',
      confirmation: done ? `PNR${(73100 + i * 17).toString(36).toUpperCase()}` : undefined,
    },
    {
      _id: new ObjectId(),
      type: 'hotel',
      description: 'الإقامة في الفندق',
      details: 'غرفة عائلية مع الإفطار',
      startDate: dep.date,
      qty: 1,
      unitPrice: 0,
      supplierId: suppliers[0]._id,
      cost: hotelUsd,
      costCurrency: 'USD',
      costInBooking: (hotelUsd / 100) * 1310,
      // Some upcoming hotels are still waiting for the supplier.
      status: status === 'completed' ? 'confirmed' : done ? (i % 2 ? 'requested' : 'confirmed') : 'pending',
    },
  );
  const costTotal = services.reduce((s, x) => s + (x.costInBooking ?? 0), 0);
  const b = {
    _id: new ObjectId(),
    tenantId,
    number: `RF-${year}-${String(++seq).padStart(4, '0')}`,
    customerId: c._id,
    type: 'package',
    title: `${p.title} — ${c.name}`,
    packageId: p._id,
    departureId: dep._id,
    travelDate: dep.date,
    adults,
    children,
    travellerIds: c.travellers.slice(0, adults + children).map((t) => t._id),
    status,
    currency: 'IQD',
    services,
    discount: 0,
    total,
    costTotal,
    paid: 0,
    assignedTo: pick([sales, owner], i)._id,
    createdBy: sales._id,
    createdAt,
    updatedAt: createdAt,
  };
  if (paidShare > 0) {
    const amount = Math.round((total * paidShare) / 1000) * 1000;
    payments.push({
      _id: new ObjectId(),
      tenantId,
      number: `RC-${year}-${String(++rc).padStart(4, '0')}`,
      bookingId: b._id,
      customerId: c._id,
      kind: 'payment',
      amount,
      currency: 'IQD',
      amountInBooking: amount,
      method: pick(['cash', 'zaincash', 'bank_transfer', 'fastpay'], i),
      date: new Date(createdAt.getTime() + 2 * 86400_000).toISOString().slice(0, 10),
      voided: false,
      receivedBy: accounts._id,
      createdAt,
    });
    b.paid = amount;
  }
  bookings.push(b);
});
await db.collection('bookings').insertMany(bookings);
if (payments.length) await db.collection('payments').insertMany(payments);
await db
  .collection('counters')
  .updateOne({ _id: `${tenantId}:booking:${year}` }, { $set: { seq } }, { upsert: true });
await db
  .collection('counters')
  .updateOne({ _id: `${tenantId}:receipt:${year}` }, { $set: { seq: rc } }, { upsert: true });
await db.collection('supplierPayments').insertOne({
  _id: new ObjectId(),
  tenantId,
  supplierId: suppliers[1]._id,
  amount: 2500000,
  currency: 'IQD',
  date: day(-20),
  method: 'bank_transfer',
  reference: 'TRX-88213',
  createdBy: accounts._id,
  createdAt: ago(20),
});

// Leads in every stage.
const leadNames = [
  'سجاد علاء',
  'رنا فراس',
  'أنمار صباح',
  'تبارك وليد',
  'ضحى حامد',
  'منتظر قاسم',
  'بنين أحمد',
  'زيد نبيل',
  'ملاك ياسر',
  'حسن رياض',
];
const stages = ['new', 'new', 'new', 'contacted', 'contacted', 'quoted', 'quoted', 'won', 'lost', 'new'];
const leads = leadNames.map((name, i) => ({
  _id: new ObjectId(),
  tenantId,
  name,
  phone: `+96478${String(20000000 + i * 51234).slice(0, 8)}`,
  source: pick(['website', 'whatsapp', 'website', 'phone', 'social'], i),
  formType: i % 2 === 0 ? 'package-booking' : 'custom-trip',
  stage: stages[i],
  interest: {
    destination: pick(['تركيا', 'جورجيا', 'دبي', 'أذربيجان'], i),
    packageSlug: pick(packages, i).slug,
    packageTitle: pick(packages, i).title,
    travellers: pick(['بالغان', 'بالغان وطفل', 'عائلة من 5'], i),
    when: pick(['الصيف القادم', 'العيد', 'الشهر القادم'], i),
  },
  message: i % 3 === 0 ? 'نريد فندقاً قريباً من الأسواق' : undefined,
  assignedTo: i % 2 ? sales._id : undefined,
  nextFollowUp: i < 4 ? day(i - 1) : undefined,
  lostReason: stages[i] === 'lost' ? 'السعر أعلى من الميزانية' : undefined,
  createdAt: ago(i * 2 + 1),
  updatedAt: ago(i),
}));
await db.collection('leads').insertMany(leads);
await db.collection('activities').insertMany(
  leads.flatMap((l) => [
    {
      tenantId,
      entity: { type: 'lead', id: l._id },
      kind: 'system',
      text: l.source === 'website' ? 'website' : 'created',
      createdAt: l.createdAt,
    },
    ...(l.stage !== 'new'
      ? [
          {
            tenantId,
            entity: { type: 'lead', id: l._id },
            kind: 'call',
            text: 'تم الاتصال وإرسال تفاصيل الباقة على واتساب',
            userId: sales._id,
            createdAt: new Date(l.createdAt.getTime() + 3600_000),
          },
        ]
      : []),
  ]),
);

await db.collection('visas').insertMany(
  customers.slice(0, 5).map((c, i) => ({
    _id: new ObjectId(),
    tenantId,
    customerId: c._id,
    travellerId: c.travellers[0]._id,
    travellerName: c.name,
    bookingId: bookings[i]?._id,
    country: pick(['الإمارات', 'أذربيجان', 'تركيا'], i),
    visaType: 'سياحية',
    status: pick(['collecting', 'submitted', 'approved', 'issued', 'submitted'], i),
    submittedAt: i ? day(-10 + i) : undefined,
    expectedAt: day(3 + i),
    assignedTo: ops._id,
    createdAt: ago(15),
    updatedAt: ago(i),
  })),
);
await db.collection('tasks').insertMany([
  {
    tenantId,
    title: 'تأكيد حجز الفندق لعائلة محمد جاسم',
    dueDate: day(-1),
    done: false,
    assignedTo: owner._id,
    related: { type: 'booking', id: bookings[0]._id },
    createdBy: owner._id,
    createdAt: ago(3),
  },
  {
    tenantId,
    title: 'متابعة دفعة الرصيد المتبقي',
    dueDate: day(0),
    done: false,
    assignedTo: owner._id,
    createdBy: accounts._id,
    createdAt: ago(2),
  },
  {
    tenantId,
    title: 'إرسال برنامج الرحلة النهائي',
    dueDate: day(2),
    done: false,
    assignedTo: owner._id,
    createdBy: ops._id,
    createdAt: ago(1),
  },
  {
    tenantId,
    title: 'الاتصال بالطلبات الجديدة من الموقع',
    dueDate: day(0),
    done: false,
    assignedTo: sales._id,
    createdBy: owner._id,
    createdAt: ago(1),
  },
]);

// Quotes at every stage, and invoices for some confirmed bookings.
const quoteStates = [
  { status: 'draft', validUntil: day(6) },
  { status: 'sent', validUntil: day(4), sentAt: ago(2) },
  { status: 'sent', validUntil: day(-3), sentAt: ago(12) },
  { status: 'rejected', validUntil: day(-10), sentAt: ago(20) },
];
const quotes = quoteStates.map((qs, i) => {
  const c = customers[13 + i] ?? customers[i];
  const p = pick(packages, i + 2);
  const lines = [
    {
      _id: new ObjectId(),
      type: 'flight',
      description: 'تذاكر طيران — البالغون',
      qty: 2,
      unitPrice: 450000,
      status: 'pending',
    },
    {
      _id: new ObjectId(),
      type: 'hotel',
      description: `فندق 4 نجوم — ${p.nights} ليالٍ`,
      qty: 1,
      unitPrice: 600000,
      status: 'pending',
    },
    {
      _id: new ObjectId(),
      type: 'transfer',
      description: 'الاستقبال والتوديع من المطار',
      qty: 1,
      unitPrice: 60000,
      status: 'pending',
    },
  ];
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  return {
    _id: new ObjectId(),
    tenantId,
    branchId: mainBranch,
    number: `QT-${year}-${String(i + 1).padStart(4, '0')}`,
    customerId: c._id,
    title: `${p.destination} — ${c.name}`,
    travelDate: day(30 + i * 7),
    adults: 2,
    children: 0,
    currency: 'IQD',
    lines,
    discount: 0,
    total,
    costTotal: 0,
    ...qs,
    assignedTo: sales._id,
    createdBy: sales._id,
    createdAt: ago(25 - i * 5),
    updatedAt: ago(1),
  };
});
await db.collection('quotes').insertMany(quotes);
await db
  .collection('counters')
  .updateOne({ _id: `${tenantId}:quote:${year}` }, { $set: { seq: quotes.length } }, { upsert: true });

const invoiced = bookings.filter((b) => b.status !== 'draft').slice(0, 5);
await db.collection('invoices').insertMany(
  invoiced.map((b, i) => {
    const c = customers.find((x) => String(x._id) === String(b.customerId));
    return {
      tenantId,
      branchId: mainBranch,
      number: `INV-${year}-${String(i + 1).padStart(4, '0')}`,
      bookingId: b._id,
      customerId: b.customerId,
      customer: { name: c.name, phone: c.phone },
      date: b.createdAt.toISOString().slice(0, 10),
      currency: b.currency,
      lines: b.services
        .filter((l) => l.unitPrice > 0)
        .map((l) => ({ description: l.description, qty: l.qty, unitPrice: l.unitPrice })),
      discount: 0,
      total: b.total,
      status: 'issued',
      createdBy: accounts._id,
      createdAt: b.createdAt,
    };
  }),
);
await db
  .collection('counters')
  .updateOne({ _id: `${tenantId}:invoice:${year}` }, { $set: { seq: invoiced.length } }, { upsert: true });

// Accounting: the accounts the demo needs (the app adds the rest of the chart),
// the owner's opening capital, and a few months of running expenses. Bookings,
// payments and supplier payments are posted by the app the first time
// accounting is opened.
const acc = (code, name, type, extra = {}) => ({
  _id: new ObjectId(),
  tenantId,
  code,
  name,
  type,
  active: true,
  createdAt: ago(120),
  ...extra,
});
const ledgerAccounts = {
  cash: acc('1100', 'الصندوق', 'asset', { key: 'cash', isCash: true }),
  bank: acc('1110', 'البنك', 'asset', { key: 'bank', isCash: true }),
  capital: acc('3100', 'رأس المال', 'equity', { key: 'capital' }),
  salaries: acc('6100', 'الرواتب والأجور', 'expense'),
  rent: acc('6200', 'الإيجار', 'expense'),
  utilities: acc('6300', 'الكهرباء والإنترنت والاتصالات', 'expense'),
  marketing: acc('6400', 'التسويق والإعلانات', 'expense'),
};
await db.collection('accounts').insertMany(Object.values(ledgerAccounts));
await db.collection('journalEntries').insertOne({
  tenantId,
  number: `JE-${year}-0001`,
  date: day(-120),
  memo: 'رأس المال الافتتاحي',
  source: { type: 'manual' },
  branchId: mainBranch,
  lines: [
    { accountId: ledgerAccounts.bank._id, debit: 25000000, credit: 0 },
    { accountId: ledgerAccounts.capital._id, debit: 0, credit: 25000000 },
  ],
  total: 25000000,
  createdBy: owner._id,
  createdAt: ago(120),
});
await db
  .collection('counters')
  .updateOne({ _id: `${tenantId}:journal:${year}` }, { $set: { seq: 1 } }, { upsert: true });
const expenseRows = [];
for (let m = 3; m >= 0; m--) {
  expenseRows.push(
    {
      account: ledgerAccounts.rent,
      paidFrom: ledgerAccounts.bank,
      amount: 500000,
      payee: 'مالك المكتب',
      memo: 'إيجار الشهر',
      days: m * 30 + 2,
    },
    {
      account: ledgerAccounts.salaries,
      paidFrom: ledgerAccounts.cash,
      amount: 900000,
      payee: 'الموظفون',
      memo: 'رواتب الشهر',
      days: m * 30 + 1,
    },
    {
      account: ledgerAccounts.utilities,
      paidFrom: ledgerAccounts.cash,
      amount: 100000,
      payee: 'شركة الاتصالات',
      memo: 'إنترنت وكهرباء',
      days: m * 30 + 6,
    },
  );
  if (m % 2 === 0)
    expenseRows.push({
      account: ledgerAccounts.marketing,
      paidFrom: ledgerAccounts.bank,
      amount: 200000,
      payee: 'إعلانات ممولة',
      memo: 'حملة الموسم',
      days: m * 30 + 10,
    });
}
await db.collection('expenses').insertMany(
  expenseRows
    .filter((e) => e.days >= 1)
    .map((e, i) => ({
      tenantId,
      branchId: mainBranch,
      number: `EX-${year}-${String(i + 1).padStart(4, '0')}`,
      date: day(-e.days),
      accountId: e.account._id,
      paidFrom: e.paidFrom._id,
      amount: e.amount,
      currency: 'IQD',
      amountBase: e.amount,
      payee: e.payee,
      memo: e.memo,
      voided: false,
      createdBy: owner._id,
      createdAt: ago(e.days),
    })),
);
await db
  .collection('counters')
  .updateOne({ _id: `${tenantId}:expense:${year}` }, { $set: { seq: expenseRows.length } }, { upsert: true });

// Every scoped record belongs to a branch; about a third of the work is in the second one.
for (const c of ['leads', 'bookings', 'visas', 'quotes', 'invoices'])
  await db.collection(c).updateMany({ tenantId }, { $set: { branchId: mainBranch } });
const moved = bookings.filter((_, i) => i % 3 === 2).map((b) => b._id);
await db.collection('bookings').updateMany({ _id: { $in: moved } }, { $set: { branchId: secondBranch } });
await db.collection('payments').updateMany({ tenantId }, { $set: { branchId: mainBranch } });
for (const c of ['payments', 'invoices'])
  await db
    .collection(c)
    .updateMany({ tenantId, bookingId: { $in: moved } }, { $set: { branchId: secondBranch } });
await db
  .collection('visas')
  .updateMany({ tenantId, bookingId: { $in: moved } }, { $set: { branchId: secondBranch } });

console.log(`Demo company "${slug}" ready.`);
console.log(`Sign in as ${owner.email} / ${password}`);
console.log(`(also ${sales.email}, ${accounts.email}, ${ops.email} with the same password)`);
await client.close();
