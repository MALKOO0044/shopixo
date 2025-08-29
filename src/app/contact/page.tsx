export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <p className="mt-2 text-slate-600">Have questions? Email us at <a className="underline" href="mailto:support@shopixo.com">support@shopixo.com</a> or use the form below.</p>
      <form className="mt-6 grid gap-4">
        <input placeholder="Full name" className="rounded-md border px-3 py-2" />
        <input type="email" placeholder="Email address" className="rounded-md border px-3 py-2" />
        <textarea placeholder="Your message" rows={6} className="rounded-md border px-3 py-2" />
        <button type="button" className="btn-primary w-fit">Send message (demo)</button>
      </form>
    </div>
  );
}
