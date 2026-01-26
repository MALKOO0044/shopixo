import { getCart } from "@/lib/cart-actions";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import CartCountSync from "./CartCountSync";
import CartItemRow from "./CartItemRow";
import SelectAllCheckbox from "./SelectAllCheckbox";
import OrderSummary from "./OrderSummary";
import CartToast from "./CartToast";

export const metadata = {
  title: "Shopping Cart",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CartPage() {
  const cartItems = await getCart();
  
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = cartItems.reduce((acc, item) => {
    if (item.product) {
      const unit = (item.variant && item.variant.price !== null && item.variant.price !== undefined)
        ? item.variant.price!
        : item.product.price;
      return acc + item.quantity * unit;
    }
    return acc;
  }, 0);

  const originalTotal = cartItems.reduce((acc, item) => {
    if (item.product) {
      const originalPrice = (item.product as any).compare_at_price || item.product.price;
      return acc + item.quantity * originalPrice;
    }
    return acc;
  }, 0);

  const savings = originalTotal - subtotal;

  return (
    <div className="min-h-screen bg-gray-50">
      <CartToast />
      <div className="container py-8">
        <CartCountSync serverCount={totalQuantity} />
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Your cart is empty.</p>
            <Link 
              href="/shop" 
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Cart Items Table */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
                  <div className="col-span-1 flex items-center">
                    <SelectAllCheckbox itemCount={cartItems.length} />
                  </div>
                  <div className="col-span-5 flex items-center">
                    <span className="ml-2">Item</span>
                  </div>
                  <div className="col-span-2 text-center">Unit Price</div>
                  <div className="col-span-4 text-center">Quantity</div>
                </div>
                
                {/* Cart Items */}
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <CartItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
              
              {/* Invalid Items Section (placeholder) */}
              {/* This could be used for out-of-stock items */}
            </div>
            
            {/* Order Summary Sidebar */}
            <div className="lg:w-80">
              <OrderSummary 
                subtotal={subtotal} 
                originalTotal={originalTotal}
                savings={savings}
                itemCount={cartItems.length}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
