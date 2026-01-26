export const metadata = {
  title: "Privacy Policy | Shopixo",
  description: "Learn how we collect, use, and protect your personal data at Shopixo.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-slate-700">
        <strong>Shopixo</strong> respects your privacy and is committed to protecting your personal data. This policy explains
        the types of information we collect, how we use and share it, and your choices regarding it.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Information We Collect</h2>
      <ul className="list-disc pl-6 mt-3 text-slate-700 space-y-2">
        <li>Account information: Name, email, phone number (if provided), profile picture.</li>
        <li>Order and payment information: Order details and shipping addresses. We do not store payment card data on our servers.</li>
        <li>Usage data: Login records, pages you visit, and cookies for analytics and performance improvement.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">How We Use Your Information</h2>
      <ul className="list-disc pl-6 mt-3 text-slate-700 space-y-2">
        <li>Providing services, creating accounts, and processing orders.</li>
        <li>Improvement, fraud prevention, and technical support.</li>
        <li>Sending account or order-related notifications (you can unsubscribe from marketing emails).</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Cookies</h2>
      <p className="mt-3 text-slate-700">
        We use cookies and similar technologies to enable login functionality, save your shopping cart,
        and for analytics. You can control cookies through your browser settings, but disabling them may affect some features.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Sharing Information</h2>
      <p className="mt-3 text-slate-700">
        We may share your data with trusted service providers only to the extent necessary to provide our services (such as payment providers,
        shipping companies, and analytics), with adherence to protection and confidentiality measures. We will not sell your personal information to third parties.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Payment Services</h2>
      <p className="mt-3 text-slate-700">
        Payments are processed by secure external providers; we do not store payment card numbers on our servers.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Your Rights</h2>
      <ul className="list-disc pl-6 mt-3 text-slate-700 space-y-2">
        <li>Access, update, and correct your data.</li>
        <li>Request data deletion according to our deletion policy: <a className="text-primary underline" href="/data-deletion">/data-deletion</a>.</li>
        <li>Object to certain processing where legally possible.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Data Retention</h2>
      <p className="mt-3 text-slate-700">
        We retain data as long as necessary to provide our services, comply with legal obligations, prevent fraud, and resolve disputes.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Contact Us</h2>
      <p className="mt-3 text-slate-700">
        For any privacy-related inquiries, you can contact us at: {" "}
        <a className="text-primary underline" href="mailto:support@shopixo.com">support@shopixo.com</a>
      </p>

      <p className="mt-10 text-xs text-slate-500">Last updated: September 14, 2025</p>
    </div>
  );
}
