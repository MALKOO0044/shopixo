import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignInPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
    else if (v != null) params.set(k, v);
  }
  redirect(`/login${params.toString() ? `?${params.toString()}` : ""}`);
}
