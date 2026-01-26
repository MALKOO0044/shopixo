import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Address } from "@/lib/types";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/lib/address-actions";
import SubmitButton from "@/components/submit-button";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import FormStatusToast from "@/components/form-status-toast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AddressesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/addresses");
  }

  const { data } = await supabase
    .from("addresses")
    .select("id,user_id,full_name,phone,line1,line2,city,state,postal_code,country,is_default,created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("id", { ascending: true });

  const addresses = (data || []) as Address[];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Addresses</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Address</h2>
          <form action={createAddress} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input name="full_name" autoComplete="name" required className="w-full rounded border px-3 py-2" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="^\+?[0-9\s\-]{6,}$" className="w-full rounded border px-3 py-2" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address Line 1</label>
              <input name="line1" autoComplete="address-line1" required className="w-full rounded border px-3 py-2" placeholder="Street and house number" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address Line 2</label>
              <input name="line2" autoComplete="address-line2" className="w-full rounded border px-3 py-2" placeholder="Apartment, suite, etc. (optional)" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input name="city" autoComplete="address-level2" required className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State/Province</label>
                <input name="state" autoComplete="address-level1" className="w-full rounded border px-3 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Postal Code</label>
                <input name="postal_code" autoComplete="postal-code" inputMode="numeric" className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input name="country" autoComplete="country" required className="w-full rounded border px-3 py-2" placeholder="e.g., US, UK, CA" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_default" className="h-4 w-4" />
              Set as default
            </label>
            <div>
              <SubmitButton label="Save Address" pendingLabel="Saving..." />
            </div>
            <FormStatusToast successMessage="Address saved successfully" />
          </form>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Saved Addresses</h2>
          {addresses.length === 0 ? (
            <p className="text-gray-600">No saved addresses yet.</p>
          ) : (
            <ul className="space-y-4">
              {addresses.map((addr) => (
                <li key={addr.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{addr.full_name} {addr.is_default && <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Default</span>}</p>
                      <p className="text-sm text-gray-700">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                      <p className="text-sm text-gray-700">{addr.city}{addr.state ? `, ${addr.state}` : ""}{addr.postal_code ? `, ${addr.postal_code}` : ""}</p>
                      <p className="text-sm text-gray-700">{addr.country}{addr.phone ? ` • ${addr.phone}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!addr.is_default && (
                        <form action={setDefaultAddress}>
                          <input type="hidden" name="id" value={String(addr.id)} />
                          <SubmitButton label="Set Default" pendingLabel="Setting..." variant="secondary" className="px-3 py-1.5 text-sm" />
                          <FormStatusToast successMessage="Address set as default" />
                        </form>
                      )}
                      <form action={deleteAddress}>
                        <input type="hidden" name="id" value={String(addr.id)} />
                        <ConfirmSubmitButton label="Delete" pendingLabel="Deleting..." confirmMessage="Are you sure you want to delete this address?" className="px-3 py-1.5 text-sm" />
                        <FormStatusToast successMessage="Address deleted" />
                      </form>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-700 hover:text-black">Edit Address</summary>
                    <form action={updateAddress} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={String(addr.id)} />
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input name="full_name" autoComplete="name" defaultValue={addr.full_name} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <input name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="^\+?[0-9\s\-]{6,}$" defaultValue={addr.phone ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address Line 1</label>
                        <input name="line1" autoComplete="address-line1" defaultValue={addr.line1} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address Line 2</label>
                        <input name="line2" autoComplete="address-line2" defaultValue={addr.line2 ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">City</label>
                        <input name="city" autoComplete="address-level2" defaultValue={addr.city} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State/Province</label>
                        <input name="state" autoComplete="address-level1" defaultValue={addr.state ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Postal Code</label>
                        <input name="postal_code" autoComplete="postal-code" inputMode="numeric" defaultValue={addr.postal_code ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Country</label>
                        <input name="country" autoComplete="country" defaultValue={addr.country} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" name="is_default" defaultChecked={addr.is_default} className="h-4 w-4" />
                          Set as default
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <SubmitButton label="Save Changes" pendingLabel="Saving..." />
                      </div>
                      <FormStatusToast successMessage="Address updated" />
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
