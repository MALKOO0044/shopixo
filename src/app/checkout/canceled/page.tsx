import Link from "next/link";

export default function CheckoutCanceledPage() {
  return (
    <div className="container text-center py-12">
      <h1 className="text-3xl font-bold text-red-600">Payment Canceled</h1>
      <p className="mt-4">Your order was not processed.</p>
      <p className="mt-2">You have not been charged. Please try again or contact support if you are having trouble.</p>
      <Link href="/cart" className="btn-secondary mt-6 inline-block">Return to Cart</Link>
    </div>
  );
}
