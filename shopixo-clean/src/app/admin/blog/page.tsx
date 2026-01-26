import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DeleteBlogPostButton from "@/app/admin/blog/delete-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPosts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [] as any[];
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, published, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [] as any[];
  return data || [];
}

export default async function AdminBlogPage() {
  const posts = await getPosts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog</h1>
        <Link href={{ pathname: "/admin/blog/new" }} className="btn-primary px-4 py-2 rounded-md bg-black text-white">
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-600">No posts yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Published</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3 text-slate-600">{p.slug}</td>
                  <td className="p-3">{p.published ? "Yes" : "No"}</td>
                  <td className="p-3">{p.created_at ? new Date(p.created_at).toLocaleString() : ""}</td>
                  <td className="p-3 text-right space-x-2">
                    <Link href={{ pathname: "/admin/blog/[id]/edit", query: { id: String(p.id) } }} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <DeleteBlogPostButton postId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
