import BlogForm from "@/app/admin/blog/_components/blog-form";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPost(id: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null as any;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, published")
    .eq("id", id)
    .maybeSingle();
  return data || null;
}

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const post = Number.isFinite(id) ? await getPost(id) : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Blog Post</h1>
      {post ? (
        <BlogForm
          mode="edit"
          initial={{ id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, published: post.published }}
        />
      ) : (
        <p className="text-slate-600">Post not found.</p>
      )}
    </div>
  );
}
