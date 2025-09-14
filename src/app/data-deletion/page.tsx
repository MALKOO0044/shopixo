export const metadata = { title: "حذف البيانات | Shopixo" };

export default function DataDeletionPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">سياسة حذف البيانات</h1>
      <p className="mt-4 text-slate-700">
        نلتزم في <strong>Shopixo</strong> بحماية خصوصيتك. يوضح هذا المستند الطرق المتاحة لك
        لطلب حذف بياناتك الشخصية المرتبطة بحسابك أو عمليات الشراء لديك.
      </p>

      <h2 className="mt-8 text-xl font-semibold">طرق حذف البيانات</h2>
      <ol className="list-decimal pl-6 mt-3 space-y-3 text-slate-700">
        <li>
          حذف الحساب ذاتيًا: إذا كان لديك حساب مسجّل لدينا، يمكنك طلب حذف الحساب وجميع
          البيانات المرتبطة به من صفحة الأمان في حسابك: <a className="text-primary underline" href="/account/security">/account/security</a>.
        </li>
        <li>
          عبر البريد الإلكتروني: في حال تعذّر تسجيل الدخول أو لم يكن لديك حساب، يمكنك إرسال طلب
          حذف بيانات إلى البريد التالي: <a className="text-primary underline" href="mailto:naserabusafeh2016@gmail.com">naserabusafeh2016@gmail.com</a>
          مع تضمين المعلومات التالية:
          <ul className="list-disc pl-6 mt-2">
            <li>الاسم الكامل.</li>
            <li>البريد الإلكتروني المستخدم في التسجيل (إن وجد).</li>
            <li>وصف مختصر للبيانات المطلوب حذفها.</li>
          </ul>
        </li>
        <li>
          يمكنك كذلك استخدام صفحة الاتصال الخاصة بنا: <a className="text-primary underline" href="/contact">/contact</a> لفتح تذكرة دعم بخصوص حذف البيانات.
        </li>
      </ol>

      <h2 className="mt-8 text-xl font-semibold">ما الذي يُحذف؟</h2>
      <p className="mt-3 text-slate-700">
        عند الموافقة على طلبك، نقوم بحذف أو إلغاء هوية (Anonymize) البيانات الشخصية المرتبطة
        بحسابك، والتي قد تشمل معلومات الملف الشخصي وطرق التواصل وسجلّ العناوين. قد نحتفظ
        ببعض السجلات ذات الطبيعة المالية أو الضريبية أو سجلات الاحتيال وفق الالتزامات القانونية
        المعمول بها.
      </p>

      <h2 className="mt-8 text-xl font-semibold">المدة الزمنية لمعالجة الطلب</h2>
      <p className="mt-3 text-slate-700">
        عادةً ما تتم معالجة طلبات حذف البيانات خلال مدة تتراوح بين 7 إلى 30 يومًا من تأكيد
        هوية صاحب الطلب. سنقوم بإشعارك عند اكتمال العملية.
      </p>

      <p className="mt-10 text-xs text-slate-500">آخر تحديث: 14 سبتمبر 2025</p>
    </div>
  );
}
