"use client";

import { useState } from "react";

interface SelectAllCheckboxProps {
  itemCount: number;
}

export default function SelectAllCheckbox({ itemCount }: SelectAllCheckboxProps) {
  const [isSelected, setIsSelected] = useState(true);
  
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          setIsSelected(e.target.checked);
          // Broadcast selection state to all items
          const event = new CustomEvent('cart-select-all', { 
            detail: { selected: e.target.checked } 
          });
          window.dispatchEvent(event);
        }}
        className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
      />
      <span className="text-sm font-medium text-gray-700">Select All</span>
    </label>
  );
}
