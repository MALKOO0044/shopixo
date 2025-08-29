export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">About Shopixo</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          Shopixo is a modern e-commerce store focused on quality products, secure checkout, and great
          customer experiences. We curate products across apparel, electronics, home, and accessories.
        </p>
        <p>
          Our mission is to deliver a professional, fast, and enjoyable shopping journey with clear
          policies and top-notch support.
        </p>
      </div>
    </div>
  );
}
