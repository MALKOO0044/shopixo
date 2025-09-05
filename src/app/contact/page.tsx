import ContactForm from "@/components/contact-form";
export const metadata = { title: "اتصل بنا" };

export default function ContactPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">اتصل بنا</h1>
      <p className="mt-2 text-slate-600">
        هل لديك أسئلة؟ راسلنا على البريد
        {" "}
        <a className="underline" href="mailto:support@shopixo.com">support@shopixo.com</a>
        {" "}
        أو استخدم النموذج التالي للتواصل مباشرة.
      </p>
      <ContactForm />
    </div>
  );
}
