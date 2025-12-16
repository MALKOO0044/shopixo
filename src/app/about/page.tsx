export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">About Us</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          Shopixo is a modern e-commerce store focused on product quality, secure payments, and an enjoyable shopping experience.
        </p>
        <p>
          Our goal is to provide a professional, fast, and convenient shopping journey with clear policies and excellent customer support.
        </p>
      </div>
    </div>
  );
}
