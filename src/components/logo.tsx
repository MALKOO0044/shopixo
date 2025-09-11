import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  // Use composite header logo (star + wordmark) for brand recognition
  const src = "/logo-header.svg";
  return (
    <Link href="/" aria-label={`${name} home`} className="flex items-center select-none">
      {/* Use crisp SVG wordmark with fixed dimensions to avoid blurriness */}
      <Image
        src={src}
        alt={`${name} Logo`}
        width={180}
        height={40}
        priority
        className="h-[40px] w-[180px]"
      />
    </Link>
  );
}
