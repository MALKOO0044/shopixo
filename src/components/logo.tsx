import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  // Always use the crisp local wordmark to avoid blurry/legacy logos from envs
  const src = "/logo-wordmark.svg";
  return (
    <Link href="/" aria-label={`${name} home`} className="flex items-center select-none">
      {/* Use crisp SVG wordmark with fixed dimensions to avoid blurriness */}
      <Image
        src={src}
        alt={`${name} Logo`}
        width={160}
        height={40}
        priority
        className="h-[40px] w-[160px]"
      />
    </Link>
  );
}
