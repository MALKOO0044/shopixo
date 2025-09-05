import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
export const metadata = { title: "Blog" };

export default async function BlogPage() {
  let posts: Array<{ id: number; title: string; slug: string; excerpt: string | null; created_at: string | null }> = [];
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data } = await supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(24);
    posts = (data as any[]) || [];
  } catch {}

  const hasPosts = Array.isArray(posts) && posts.length > 0;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">المدونة</h1>
      {!hasPosts && (
        <p className="mt-2 text-slate-600">لا توجد منشورات بعد. سيتم نشر التحديثات والمقالات قريبًا.</p>
      )}
      {hasPosts && (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <article key={p.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="text-xs text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</div>
              <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
              {p.excerpt && <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
