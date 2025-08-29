"use client";
import Image from "next/image";
import { useState } from "react";

export default function Logo() {
  const [src, setSrc] = useState("/logo.png");
  return (
    <div className="flex items-center gap-2 select-none">
      <Image
        src={src}
        alt="Shopixo"
        width={28}
        height={28}
        priority
        className="rounded-md"
        onError={() => setSrc("/favicon.svg")}
      />
      <span className="sr-only">Shopixo</span>
    </div>
  );
}
