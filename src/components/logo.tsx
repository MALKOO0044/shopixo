import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  const brandUrl = process.env.NEXT_PUBLIC_BRAND_LOGO_URL;
  const src = brandUrl && typeof brandUrl === 'string' && brandUrl.trim().length > 0 ? brandUrl.trim() : "/favicon.svg";
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      {src.startsWith('/') ? (
        <Image
          src={src}
          alt={`${name} Logo`}
          width={40}
          height={40}
          priority
          quality={100}
          className="rounded-xl object-cover shadow-sm"
        />
      ) : (
        <img
          src={src}
          alt={`${name} Logo`}
          width={40}
          height={40}
          className="rounded-xl object-cover shadow-sm"
          loading="eager"
        />
      )}
      <span className="text-lg font-semibold tracking-tight">{name}</span>
    </Link>
  );
}
