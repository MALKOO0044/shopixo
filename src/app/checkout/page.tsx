<<<<<<< HEAD
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase";

interface CartItem {
  id: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  price: number;
  variantName?: string | null; // Customer's selected variant (e.g., "Star blue-XL") from cart_items table
  product: {
    id: number;
    title: string;
    price: number;
    images: string[];
  };
  variant?: {
    id: number;
    price: number | null;
    option_value: string;
    cj_sku?: string;
    cj_variant_id?: string;
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [shippingForm, setShippingForm] = useState({
    name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          if (user.email) {
            setShippingForm(prev => ({ ...prev, email: user.email || "" }));
          }
        }

        const res = await fetch("/api/cart");
        if (res.ok) {
          const data = await res.json();
          setCart(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const subtotal = cart.reduce((acc, item) => {
    const price = item.variant?.price ?? item.product?.price ?? item.price;
    return acc + (price * item.quantity);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const items = cart.map((item) => ({
        productId: item.product?.id || item.productId,
        variantId: item.variant?.id || item.variantId,
        // CRITICAL: Use variantName from cart_items table first (e.g., "Star blue-XL")
        // This is the customer's actual selection, stored when adding to cart
        variantName: item.variantName || item.variant?.option_value || null,
        quantity: item.quantity,
        price: item.variant?.price ?? item.product?.price ?? item.price,
        cjSku: item.variant?.cj_sku || null,
        cjVariantId: item.variant?.cj_variant_id || null,
      }));

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingAddress: shippingForm,
          customer: {
            email: shippingForm.email,
            name: shippingForm.name,
          },
          userId: userId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.sessionUrl) {
        throw new Error(data.error || "Checkout failed");
      }

      window.location.href = data.sessionUrl;
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="mt-4 text-slate-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block text-blue-600 hover:underline">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Shipping Information</h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    value={shippingForm.name}
                    onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={shippingForm.email}
                    onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={shippingForm.phone}
                    onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <Input
                    id="address1"
                    required
                    value={shippingForm.address1}
                    onChange={(e) => setShippingForm({ ...shippingForm, address1: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    value={shippingForm.address2}
                    onChange={(e) => setShippingForm({ ...shippingForm, address2: e.target.value })}
                    placeholder="Apt 4B (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={shippingForm.city}
                    onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>

                <div>
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    required
                    value={shippingForm.state}
                    onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>

                <div>
                  <Label htmlFor="postalCode">ZIP/Postal Code *</Label>
                  <Input
                    id="postalCode"
                    required
                    value={shippingForm.postalCode}
                    onChange={(e) => setShippingForm({ ...shippingForm, postalCode: e.target.value })}
                    placeholder="10001"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country *</Label>
                  <select
                    id="country"
                    required
                    value={shippingForm.country}
                    onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="SA">Saudi Arabia</option>
                    <option value="AE">United Arab Emirates</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-lg"
              variant="cta"
            >
              {submitting ? "Processing..." : `Pay ${formatCurrency(subtotal)}`}
            </Button>

            <p className="text-sm text-slate-500 text-center">
              You will be redirected to secure payment powered by Stripe
            </p>
          </form>
        </div>

        <div>
          <div className="bg-white rounded-xl border p-6 shadow-sm sticky top-4">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {cart.map((item) => {
                const price = item.variant?.price ?? item.product?.price ?? item.price;
                return (
                  <div key={item.id} className="flex gap-3">
                    {item.product?.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{item.product?.title}</p>
                      {item.variant?.option_value && (
                        <p className="text-xs text-slate-500">{item.variant.option_value}</p>
                      )}
                      <p className="text-sm text-slate-600">
                        {item.quantity} x {formatCurrency(price)}
                      </p>
                    </div>
                    <p className="font-medium text-sm">{formatCurrency(price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
=======
export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-slate-600">To complete your secure payment, go to your cart and click the checkout button.</p>
      <div className="mt-6">
        <a href="/cart" className="btn-primary inline-block">Go to Cart</a>
        <p className="mt-3 text-sm text-slate-600">You will be redirected to secure payment.</p>
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
      </div>
    </div>
  );
}
