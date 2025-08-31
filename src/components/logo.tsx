import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      <Image
        src="/favicon.svg" // Use existing asset to avoid 404
        alt="Shopixo Logo"
        width={28}
        height={28}
        priority
        className="rounded-md"
      />
      <span className="text-lg font-semibold tracking-tight">Shopixo</span>
    </Link>
  );
}
