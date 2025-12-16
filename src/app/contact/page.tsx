import ContactForm from "@/components/contact-form";
export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <p className="mt-2 text-slate-600">
        Have questions? Email us at
        {" "}
        <a className="underline" href="mailto:support@shopixo.com">support@shopixo.com</a>
        {" "}
        or use the form below to get in touch.
      </p>
      <ContactForm />
    </div>
  );
}
