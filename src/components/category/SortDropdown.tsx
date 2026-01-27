"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface SortDropdownProps {
  currentSort?: string;
}

export default function SortDropdown({ currentSort }: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    if (e.target.value) {
      newParams.set("sort", e.target.value);
    } else {
      newParams.delete("sort");
    }
    router.push(`?${newParams.toString()}`);
  };

  return (
    <select
      className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
      value={currentSort || ""}
      onChange={handleSortChange}
    >
      <option value="">Sort by: Most Popular</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
    </select>
  );
}
