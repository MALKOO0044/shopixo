export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Blog</h1>
      <p className="mt-2 text-slate-600">Our blog is coming soon. We will integrate Sanity CMS for content management.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map((i) => (
          <div key={i} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">Coming soon</div>
            <div className="mt-2 font-semibold">Placeholder post {i}</div>
            <p className="mt-1 text-sm text-slate-600">Tips, launches, and product stories will appear here.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
