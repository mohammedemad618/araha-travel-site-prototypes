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
    'users',
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
const now = new Date();
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
].map((s) => ({
  _id: new ObjectId(),
  tenantId,
  ...s,
  passwordHash: hash(password),
  mustChangePassword: false,
  active: true,
  createdAt: ago(110),
}));
await db.collection('users').deleteMany({ email: { $in: staff.map((s) => s.email) } });
await db.collection('users').insertMany(staff);
const [owner, sales, accounts, ops] = staff;

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
  const items = [
    { _id: new ObjectId(), description: `${p.title} — البالغون`, qty: adults, unitPrice: p.price },
  ];
  if (children)
    items.push({
      _id: new ObjectId(),
      description: `${p.title} — الأطفال`,
      qty: children,
      unitPrice: p.childPrice,
    });
  const total = items.reduce((s, x) => s + x.qty * x.unitPrice, 0);
  const costs = [
    {
      _id: new ObjectId(),
      supplierId: pick(suppliers, i % 2 ? 1 : 2)._id,
      description: 'تذاكر الطيران',
      amount: Math.round(total * 0.35),
      currency: 'IQD',
      amountInBooking: Math.round(total * 0.35),
    },
    {
      _id: new ObjectId(),
      supplierId: suppliers[0]._id,
      description: 'الفندق',
      amount: Math.round((total * 0.3) / 1310) * 100,
      currency: 'USD',
      amountInBooking: Math.round((total * 0.3) / 1310) * 1310,
    },
  ];
  const costTotal = costs.reduce((s, x) => s + x.amountInBooking, 0);
  const createdAt = ago(95 - i * 7);
  const status = dep.date < day(0) ? 'completed' : i % 6 === 5 ? 'draft' : 'confirmed';
  const paidShare = status === 'completed' ? 1 : status === 'draft' ? 0 : pick([1, 0.5, 0.3, 1], i);
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
    items,
    discount: 0,
    total,
    costs,
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
await db
  .collection('supplierPayments')
  .insertOne({
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
await db
  .collection('activities')
  .insertMany(
    leads.flatMap((l, i) => [
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

console.log(`Demo company "${slug}" ready.`);
console.log(`Sign in as ${owner.email} / ${password}`);
console.log(`(also ${sales.email}, ${accounts.email}, ${ops.email} with the same password)`);
await client.close();
