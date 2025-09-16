import Link from "next/link";

export default function Logo() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  return (
    <Link href="/" className="block select-none min-w-0">
      <span className="block truncate text-lg font-semibold tracking-tight">{name}</span>
    </Link>
  );
}
