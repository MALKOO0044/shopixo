export const dynamic = 'force-dynamic'

export default function CjAdminPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">CJ Admin</h1>
      <p className="text-sm opacity-80">أدوات الإدارة لمزامنة كتالوج CJ، إعادة مزامنة منتج، وحساب الشحن.</p>

      <ul className="list-disc pl-6 space-y-2">
        <li>
          <a className="text-blue-600 underline" href="/admin/cj/refresh">Refresh catalog (batch) + single product</a>
        </li>
        <li>
          <a className="text-blue-600 underline" href="/admin/cj/shipping">Shipping calculator (freightCalculate)</a>
        </li>
        <li>
          <a className="text-blue-600 underline" href="/admin/cj/health">Health dashboard</a>
        </li>
      </ul>

      <div className="text-xs opacity-75">
        <p>Ensure environment variables are correctly set in Vercel:</p>
        <pre className="whitespace-pre-wrap">{`CJ_API_BASE, CJ_API_KEY (or CJ_ACCESS_TOKEN), CJ_EMAIL, CJ_WEBHOOK_SECRET,
NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
OPENAI_API_KEY (optional), AI_MODEL_TEXT (optional)`}</pre>
      </div>
    </main>
  )
}
