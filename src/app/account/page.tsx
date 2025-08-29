export const metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">Your Account</h1>
      <p className="mt-2 text-slate-600">Sign in, manage addresses, and view orders (NextAuth integration coming soon).</p>
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <button className="btn-primary" disabled>Sign in (disabled)</button>
        <p className="mt-2 text-xs text-slate-500">Guest checkout is supported at checkout.</p>
      </div>
    </div>
  );
}
