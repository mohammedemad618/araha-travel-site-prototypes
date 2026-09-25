# أريحا للسياحة والسفر — الموقع الرسمي

موقع ثنائي اللغة (عربي/إنجليزي) لشركة أريحا للسياحة والسفر، مبني بـ **Next.js** ومنشور على **Netlify**، مع لوحة تحكم لإدارة الباقات والمحتوى دون برمجة.

- الموقع: https://araha-travel.netlify.app
- لوحة التحكم: https://araha-travel.netlify.app/admin/

## التقنيات

| الجزء | التقنية |
| --- | --- |
| الإطار | Next.js 15 (App Router) + TypeScript، تصدير ثابت كامل (`output: 'export'`) |
| التنسيق | Tailwind CSS v4 بنفس ألوان وخطوط التصميم الأصلي |
| اللغات | `next-intl`: ‏`/ar/...` (من اليمين لليسار) و`/en/...` |
| المحتوى | ملفات JSON في `content/` يتم التحقق منها بـ `zod` عند كل بناء |
| لوحة التحكم | Decap CMS على `/admin` (يحفظ التعديلات في GitHub) |
| النماذج | Netlify Forms (طلب رحلة، حجز باقة، تواصل) |
| الاختبارات | Playwright (سطح المكتب والجوال) + Lighthouse CI عبر GitHub Actions |

## التشغيل محلياً

```bash
npm install
npm run dev          # http://localhost:3000/ar/
```

أوامر أخرى:

```bash
npm run build        # بناء الموقع في مجلد out/ (يفشل إذا كان في المحتوى خطأ)
npm start            # معاينة النسخة المبنية
npm run lint         # فحص الكود
npm run typecheck    # فحص الأنواع
npm run test:e2e     # اختبارات Playwright (بعد npm run build)
```

لتجربة لوحة التحكم محلياً: شغّل `npx decap-server` مع `npm run dev` ثم افتح `http://localhost:3000/admin/`.

## هيكل المشروع

```
app/[locale]/          صفحات الموقع (الرئيسية، الباقات، الوجهات، من نحن، تواصل، الأسئلة، الخصوصية، الشروط)
components/            مكوّنات الواجهة (الأقسام، البطاقات، النماذج، واتساب…)
content/               المحتوى: packages/ و destinations/ و pages/ و settings/
messages/ar.json|en.json  نصوص الواجهة الثابتة
lib/                   قراءة المحتوى والتحقق منه، SEO، التنسيق
public/admin/          إعدادات لوحة التحكم
public/__forms.html    تعريف نماذج Netlify (يجب أن تطابق الحقول components/forms/Forms.tsx)
prototype/             النموذج الأولي الأصلي من Claude Design (للمرجع فقط)
```

## النشر على Netlify

الإعدادات موجودة في `netlify.toml` (أمر البناء `npm run build` ومجلد النشر `out`).

1. في Netlify افتح المشروع **araha-travel** ← Project configuration ← Build & deploy ← **Link repository**.
2. اختر هذا المستودع وفرع `main`. سيُنشر الموقع تلقائياً مع كل تعديل على `main`، وكل Pull Request يحصل على رابط معاينة (Deploy Preview).

## إعداد لوحة التحكم (مرة واحدة)

1. في GitHub: Settings ← Developer settings ← OAuth Apps ← **New OAuth App**
   - Homepage URL: `https://araha-travel.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. في Netlify: Project configuration ← Access & security ← **OAuth** ← Install provider ← GitHub، والصق Client ID و Client Secret.
3. كل موظف سيستخدم اللوحة يحتاج حساب GitHub مضافاً كـ Collaborator على المستودع.

بعدها افتح `/admin` ← Login with GitHub.

**سير العمل التحريري:** كل تعديل في اللوحة يُحفظ كمسودة (Pull Request)، فيبني Netlify رابط معاينة وتعمل الاختبارات الآلية. عند الضغط على «نشر» يُدمج التعديل في `main` ويُنشر خلال دقيقة تقريباً. وإذا كان في المحتوى خطأ يفشل البناء ويبقى الموقع الحالي كما هو.

ما يمكن تعديله من اللوحة: الباقات (مع حالة كل موعد: متاح، مقاعد محدودة، مكتمل)، الوجهات، **دليل التأشيرات**، **دليل السفر (المقالات)**، الصفحة الرئيسية، آراء العملاء، الأسئلة الشائعة، والصفحات.

## النماذج والإشعارات

الطلبات تظهر في Netlify ← Forms. لتصلك على البريد: Forms ← Form notifications ← **Add notification ← Email notification** لكل نموذج (`custom-trip` و`package-booking` و`contact` و`callback`).

## التحديث اليومي التلقائي

حتى تختفي مواعيد المغادرة والعروض المنتهية تلقائياً، يعيد الموقع البناء كل يوم:

1. في Netlify: Project configuration ← Build & deploy ← **Build hooks** ← Add build hook (فرع `main`)، وانسخ الرابط.
2. في GitHub: Settings ← Secrets and variables ← Actions ← **New repository secret** باسم `NETLIFY_BUILD_HOOK` والصق الرابط.

(الموقع يخفي المواعيد الماضية في المتصفح أيضاً، لكن إعادة البناء تحدّث محركات البحث.)

## التحليلات (اختياري)

أضف في Netlify ← Environment variables ثم أعد النشر:

- `NEXT_PUBLIC_GA_ID` لـ Google Analytics 4 (مثل `G-XXXXXXX`)، أو
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` لـ Plausible.

الأحداث المسجلة: `whatsapp_click` و`form_submit` و`booking_open`.

## قبل الإطلاق الرسمي: بيانات يجب استبدالها

البيانات التالية مؤقتة، وتُعدَّل من لوحة التحكم (الإعدادات ← معلومات الشركة). أثناء البناء يظهر تحذير طالما بقيت بيانات التواصل التجريبية.

- [ ] رقم الهاتف وواتساب (حالياً `0000 000` تجريبية)
- [ ] البريد الإلكتروني (حالياً `info@example.com`)
- [ ] العنوان، ورقم الإجازة السياحية، وحسابات التواصل الاجتماعي
- [ ] **أرقام الثقة** (تظهر فقط عند تعبئتها): سنة التأسيس، عدد المسافرين، تقييم Google ورابطها، رابط التحقق من الإجازة
- [ ] **طرق الدفع المقبولة** وسعر صرف الدولار (اختياري، لعرض السعر التقريبي بالدولار)
- [ ] **آراء العملاء**: مخفية حالياً. أضف آراء حقيقية وبموافقة أصحابها، ثم فعّل «منشور على الموقع» لكل رأي
- [ ] **دليل التأشيرات**: راجع معلومات كل دولة مع مصادرك وحدّث «تاريخ آخر تحقق» (مصر والإمارات أولاً، ففيهما مصادر متضاربة)
- [ ] سعر الطفل وتاريخ صلاحية السعر لكل باقة (اختياري)
- [ ] الباقات والأسعار والمواعيد الحقيقية
- [ ] الصور: حالياً من Unsplash، ويُفضَّل رفع صور الشركة الأصلية
- [ ] مراجعة نصوص الخصوصية والشروط مع سياسة الشركة الفعلية
- [ ] الشعار الرسمي والنطاق الخاص (Domain)، ثم تحديث `url` في الإعدادات
