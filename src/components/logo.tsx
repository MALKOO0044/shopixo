import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  const brandUrl = process.env.NEXT_PUBLIC_BRAND_LOGO_URL;
  const src = brandUrl && brandUrl.trim().length > 0 ? brandUrl : "/logo.png"; // user can upload /public/logo.png; fallback below
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      <Image
        src={src}
        alt={`${name} Logo`}
        width={28}
        height={28}
        priority
        onError={(e) => {
          // Fallback to favicon if custom logo missing
          (e.target as HTMLImageElement).src = "/favicon.svg";
        }}
        className="rounded-md object-contain"
      />
      <span className="text-lg font-semibold tracking-tight">{name}</span>
    </Link>
  );
}
