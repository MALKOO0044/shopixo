export const metadata = {
  title: "سياسة الخصوصية | Shopixo",
  description: "تعرّف على كيفية جمعنا واستخدامنا وحماية بياناتك الشخصية في Shopixo.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">سياسة الخصوصية</h1>
      <p className="mt-4 text-slate-700">
        تحترم <strong>Shopixo</strong> خصوصيتك وتلتزم بحماية بياناتك الشخصية. توضح هذه السياسة
        أنواع المعلومات التي نجمعها وكيفية استخدامها ومشاركتها وخياراتك بشأنها.
      </p>

      <h2 className="mt-8 text-xl font-semibold">المعلومات التي نجمعها</h2>
      <ul className="list-disc pl-6 mt-3 text-slate-700 space-y-2">
        <li>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف (إن وُفّر)، صورة الملف الشخصي.</li>
        <li>معلومات الطلبات والدفع: تفاصيل الطلبات وعناوين الشحن. لا نخزّن بيانات بطاقات الدفع على خوادمنا.</li>
        <li>بيانات الاستخدام: سجلات الدخول، الصفحات التي تزورها، وملفات تعريف الارتباط لأغراض التحليلات وتحسين الأداء.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">كيف نستخدم معلوماتك</h2>
      <ul className="list-disc pl-6 mt-3 text-slate-700 space-y-2">
        <li>تقديم الخدمات، إنشاء الحسابات، ومعالجة الطلبات.</li>
        <li>التحسين، منع الاحتيال، والدعم الفني.</li>
        <li>إرسال الإشعارات المتعلقة بالحساب أو الطلبات (يمكنك إلغاء الاشتراك في الرسائل التسويقية).</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">ملفات تعريف الارتباط (Cookies)</h2>
      <p className="mt-3 text-slate-700">
        نستخدم ملفات تعريف الارتباط والتقنيات المشابهة لتمكين وظائف تسجيل الدخول، حفظ سلة التسوق،
        والتحليلات. يمكنك التحكم في ملفات الارتباط من خلال إعدادات المتصفح، وقد يؤثر التعطيل على بعض الميزات.
      </p>

      <h2 className="mt-8 text-xl font-semibold">مشاركة المعلومات</h2>
      <p className="mt-3 text-slate-700">
        قد نشارك بياناتك مع مزوّدي الخدمات الموثوقين فقط بالقدر اللازم لتقديم الخدمة (مثل مقدّمي الدفع
        وشركات الشحن والتحليلات)، ومع الالتزام بإجراءات الحماية والسرية. لن نبيع معلوماتك الشخصية لطرف ثالث.
      </p>

      <h2 className="mt-8 text-xl font-semibold">خدمات الدفع</h2>
      <p className="mt-3 text-slate-700">
        تتم معالجة المدفوعات بواسطة مزوّدين خارجيين آمنين؛ لا نخزّن أرقام بطاقات الدفع على خوادمنا.
      </p>

      <h2 className="mt-8 text-xl font-semibold">حقوقك</h2>
      <ul className="list-disc pl-6 mt-3 text-slate-700 space-y-2">
        <li>الاطّلاع على بياناتك وتحديثها وتصحيحها.</li>
        <li>طلب حذف البيانات وفقًا لسياسة الحذف لدينا: <a className="text-primary underline" href="/data-deletion">/data-deletion</a>.</li>
        <li>الاعتراض على بعض المعالجات حيثما كان ذلك ممكنًا قانونيًا.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">الاحتفاظ بالبيانات</h2>
      <p className="mt-3 text-slate-700">
        نحتفظ بالبيانات طالما لزم الأمر لتقديم الخدمة والامتثال للالتزامات القانونية ومنع الاحتيال وحلّ النزاعات.
      </p>

      <h2 className="mt-8 text-xl font-semibold">التواصل معنا</h2>
      <p className="mt-3 text-slate-700">
        لأي استفسارات تتعلق بالخصوصية يمكنك مراسلتنا على: {" "}
        <a className="text-primary underline" href="mailto:naserabusafeh2016@gmail.com">naserabusafeh2016@gmail.com</a>
      </p>

      <p className="mt-10 text-xs text-slate-500">آخر تحديث: 14 سبتمبر 2025</p>
    </div>
  );
}
