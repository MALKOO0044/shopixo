"use client";

import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { SearchIcon } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q") as string;
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } else {
      router.push(`/search`);
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        placeholder="ابحث عن منتجات..."
        aria-label="بحث"
        className="w-full rounded-md bg-background pr-9 pl-4 py-2 text-sm"
      />
    </form>
  );
}

