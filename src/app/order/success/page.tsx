import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { CheckCircle, Package, Truck } from "lucide-react";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function OrderSuccessPage({ 
  searchParams 
}: { 
  searchParams?: { [key: string]: string | string[] | undefined } 
}) {
  const orderNumber = searchParams?.order as string | undefined;
  const sessionId = searchParams?.session_id as string | undefined;

  let order: any = null;

  if (orderNumber) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, shipping_name, customer_email, created_at')
        .eq('order_number', orderNumber)
        .maybeSingle();
      order = data;
    }
  }

  return (
    <div className="container py-12 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-green-600">Order Confirmed!</h1>
        
        {order ? (
          <>
            <p className="mt-4 text-lg text-slate-600">
              Thank you for your purchase{order.shipping_name ? `, ${order.shipping_name.split(' ')[0]}` : ''}.
            </p>
            
            <div className="mt-8 bg-white rounded-xl border p-6 text-left shadow-sm">
              <h2 className="font-semibold text-lg mb-4">Order Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Number</span>
                  <span className="font-mono font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="capitalize font-medium text-blue-600">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-medium">${Number(order.total_amount).toFixed(2)} USD</span>
                </div>
                {order.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Confirmation Email</span>
                    <span className="font-medium">{order.customer_email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 bg-blue-50 rounded-xl p-6 text-left">
              <h3 className="font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5" />
                What happens next?
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <Package className="w-4 h-4 mt-0.5 text-blue-600" />
                  Your order is being processed and will be shipped soon
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-blue-600" />
                  You'll receive tracking information via email
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="w-4 h-4 mt-0.5 text-blue-600" />
                  Estimated delivery: 7-14 business days
                </li>
              </ul>
            </div>
          </>
        ) : (
          <p className="mt-4 text-lg text-slate-600">
            Your payment was successful. You will receive a confirmation email shortly.
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/account/orders" 
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            View My Orders
          </Link>
          <Link 
            href="/shop" 
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
