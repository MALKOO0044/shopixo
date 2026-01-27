"use client";

import { useState } from "react";
import { X, Ruler } from "lucide-react";

interface SizeGuideModalProps {
  sizes?: { size: string; bust?: number; waist?: number; hips?: number }[];
  unit?: "CM" | "IN";
}

const DEFAULT_SIZES = [
  { size: "S", bust: 88.9, waist: 69.8, hips: 94.6 },
  { size: "M", bust: 94, waist: 74.3, hips: 100 },
  { size: "L", bust: 99.1, waist: 79.4, hips: 104.8 },
  { size: "XL", bust: 104.8, waist: 85.1, hips: 111.1 },
  { size: "2XL", bust: 112, waist: 92.1, hips: 118 },
];

export default function SizeGuideModal({ sizes = DEFAULT_SIZES, unit: initialUnit = "CM" }: SizeGuideModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unit, setUnit] = useState<"CM" | "IN">(initialUnit);

  const convertValue = (cm: number) => {
    if (unit === "IN") {
      return (cm / 2.54).toFixed(1);
    }
    return cm.toFixed(1);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        <Ruler className="w-4 h-4" />
        Size Guide
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Size Guide</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <span className="text-sm text-gray-600">Local Size</span>
                <div className="flex border rounded overflow-hidden ml-auto">
                  <button
                    onClick={() => setUnit("CM")}
                    className={`px-3 py-1 text-sm ${unit === "CM" ? "bg-gray-800 text-white" : "bg-white text-gray-600"}`}
                  >
                    CM
                  </button>
                  <button
                    onClick={() => setUnit("IN")}
                    className={`px-3 py-1 text-sm ${unit === "IN" ? "bg-gray-800 text-white" : "bg-white text-gray-600"}`}
                  >
                    IN
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg">
                <h4 className="font-medium">Body Measurements</h4>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left text-sm font-medium">Size</th>
                    <th className="border px-4 py-2 text-center text-sm font-medium">Bust</th>
                    <th className="border px-4 py-2 text-center text-sm font-medium">Waist</th>
                    <th className="border px-4 py-2 text-center text-sm font-medium">Hips</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((row) => (
                    <tr key={row.size} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 font-medium">{row.size}</td>
                      <td className="border px-4 py-2 text-center">{row.bust ? convertValue(row.bust) : "-"}</td>
                      <td className="border px-4 py-2 text-center">{row.waist ? convertValue(row.waist) : "-"}</td>
                      <td className="border px-4 py-2 text-center">{row.hips ? convertValue(row.hips) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-xs text-gray-500 mt-3">
                *This data was obtained from manually measuring the product, it may be off by 1-2 {unit}
              </p>

              <div className="mt-6">
                <h4 className="font-bold mb-4">How to Measure your body?</h4>
                <div className="flex gap-6">
                  <div className="flex-1 space-y-4 text-sm">
                    <div>
                      <p className="font-medium">① Bust</p>
                      <p className="text-gray-600">Measure around the fullest part of your bust.</p>
                    </div>
                    <div>
                      <p className="font-medium">② Hips</p>
                      <p className="text-gray-600">Find the widest part of your hips. Generally, it's 8 inches below your waist.</p>
                    </div>
                    <div>
                      <p className="font-medium">③ Waist</p>
                      <p className="text-gray-600">Find your natural waistline. Generally, it's just below your last rib and a couple of inches above your navel.</p>
                    </div>
                  </div>
                  <div className="w-32 h-48 bg-gray-100 rounded flex items-center justify-center">
                    <svg viewBox="0 0 100 150" className="w-20 h-32 text-green-500">
                      <ellipse cx="50" cy="20" rx="12" ry="15" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <path d="M38 35 L30 70 L35 130 L45 130 L50 80 L55 130 L65 130 L70 70 L62 35" fill="none" stroke="currentColor" strokeWidth="2"/>
                      <line x1="25" y1="50" x2="35" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2"/>
                      <line x1="65" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2"/>
                      <text x="78" y="52" fontSize="8" fill="currentColor">BUST</text>
                      <line x1="25" y1="65" x2="35" y2="65" stroke="currentColor" strokeWidth="1" strokeDasharray="2"/>
                      <line x1="65" y1="65" x2="75" y2="65" stroke="currentColor" strokeWidth="1" strokeDasharray="2"/>
                      <text x="78" y="67" fontSize="8" fill="currentColor">WAIST</text>
                      <line x1="25" y1="85" x2="35" y2="85" stroke="currentColor" strokeWidth="1" strokeDasharray="2"/>
                      <line x1="65" y1="85" x2="75" y2="85" stroke="currentColor" strokeWidth="1" strokeDasharray="2"/>
                      <text x="78" y="87" fontSize="8" fill="currentColor">HIPS</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
