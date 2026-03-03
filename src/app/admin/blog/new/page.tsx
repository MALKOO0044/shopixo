import BlogForm from "@/app/admin/blog/_components/blog-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewBlogPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">New Blog Post</h1>
      <BlogForm mode="create" />
    </div>
  );
}
