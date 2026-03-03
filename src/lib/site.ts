export function getSiteUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_URL;

  const raw =
    publicUrl && publicUrl.trim().length > 0
      ? publicUrl
      : vercelUrl && vercelUrl.trim().length > 0
      ? (vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://") ? vercelUrl : `https://${vercelUrl}`)
      : "http://localhost:3000";

  try {
    const normalized = new URL(raw);
    const href = normalized.toString();
    return href.endsWith("/") ? href.slice(0, -1) : href;
  } catch {
    // Fallback in case of invalid URL
    return "http://localhost:3000";
  }
}
