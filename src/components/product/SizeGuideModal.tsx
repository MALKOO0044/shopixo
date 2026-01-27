"use client";

import { useState } from "react";
import { X, Ruler } from "lucide-react";

export type SizeChartRow = {
  size: string;
  measurements: Record<string, number>;
};

export type HowToMeasure = {
  id: string;
  title: string;
  description: string;
}[];

interface SizeGuideModalProps {
  sizeChart?: SizeChartRow[];
  measurementColumns?: string[];
  fitType?: string;
  unit?: "CM" | "IN";
  notes?: string;
  howToMeasure?: HowToMeasure;
  sizeChartImages?: string[];
}

const DEFAULT_COLUMNS = ["Shoulder Width", "Length", "Bust", "Sleeve"];

const DEFAULT_SIZES: SizeChartRow[] = [
  { size: "S", measurements: { "Shoulder Width": 48, "Length": 71, "Bust": 108, "Sleeve": 23 } },
  { size: "M", measurements: { "Shoulder Width": 50, "Length": 72, "Bust": 112, "Sleeve": 24 } },
  { size: "L", measurements: { "Shoulder Width": 54, "Length": 74, "Bust": 120, "Sleeve": 25 } },
  { size: "XL", measurements: { "Shoulder Width": 56, "Length": 75, "Bust": 124, "Sleeve": 25.5 } },
  { size: "2XL", measurements: { "Shoulder Width": 58, "Length": 77, "Bust": 132, "Sleeve": 26 } },
  { size: "3XL", measurements: { "Shoulder Width": 59, "Length": 78, "Bust": 136, "Sleeve": 26 } },
];

const DEFAULT_HOW_TO_MEASURE: HowToMeasure = [
  {
    id: "1",
    title: "Shoulder",
    description: "Measure from where the shoulder seam meets the sleeve on one side to another side."
  },
  {
    id: "2",
    title: "Bust width",
    description: "Measure from where the stitches below the armpits are on one side to another side×2 (a circle)."
  },
  {
    id: "3",
    title: "Top Length",
    description: "The length from highest point of shoulder (the intersection of shoulder seam and collar) to the bottom edge of hem."
  },
  {
    id: "4",
    title: "Sleeve length",
    description: "Measure from where the shoulder seam meets the armhole to the cuff."
  }
];

export default function SizeGuideModal({ 
  sizeChart = DEFAULT_SIZES, 
  measurementColumns,
  fitType = "Regular Fit",
  unit: initialUnit = "CM",
  notes,
  howToMeasure = DEFAULT_HOW_TO_MEASURE,
  sizeChartImages
}: SizeGuideModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unit, setUnit] = useState<"CM" | "IN">(initialUnit);
  const [activeTab, setActiveTab] = useState<"chart" | "measure">("chart");

  const columns = measurementColumns || 
    (sizeChart.length > 0 ? Object.keys(sizeChart[0].measurements) : DEFAULT_COLUMNS);

  const convertValue = (cm: number) => {
    if (unit === "IN") {
      return (cm / 2.54).toFixed(1);
    }
    return cm.toString();
  };

  const fitTypes = ["Slim", "Regular Fit", "Loose Fit"];
  const fitIndex = fitTypes.indexOf(fitType);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors border border-gray-300 rounded px-3 py-1.5 hover:border-red-400"
      >
        <Ruler className="w-4 h-4" />
        Size Guide
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold">Size Guide</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex mb-6 border-b">
                <button
                  onClick={() => setActiveTab("chart")}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === "chart" 
                      ? "border-red-500 text-red-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Size Chart
                </button>
                <button
                  onClick={() => setActiveTab("measure")}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === "measure" 
                      ? "border-red-500 text-red-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  How to Measure
                </button>
              </div>

              {activeTab === "chart" && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">Fit Type</span>
                        <div className="relative w-40 h-1 bg-gray-200 rounded">
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-800 rounded-full"
                            style={{ left: `${(fitIndex / (fitTypes.length - 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                          />
                          <div className="absolute -bottom-5 left-0 text-xs text-gray-500">Slim</div>
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-500">Regular Fit</div>
                          <div className="absolute -bottom-5 right-0 text-xs text-gray-500">Loose Fit</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-8 mb-4">
                      <span className="text-sm font-medium">Size Chart</span>
                      <div className="flex border rounded overflow-hidden">
                        <button
                          onClick={() => setUnit("CM")}
                          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                            unit === "CM" 
                              ? "bg-gray-800 text-white" 
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          CM
                        </button>
                        <button
                          onClick={() => setUnit("IN")}
                          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                            unit === "IN" 
                              ? "bg-gray-800 text-white" 
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          IN
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="bg-gray-800 text-white px-4 py-2.5 rounded-t-lg">
                      <span className="font-medium">Product Measurements</span>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700">Size</th>
                          {columns.map((col) => (
                            <th key={col} className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sizeChart.map((row, idx) => (
                          <tr key={row.size} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="border border-gray-200 px-4 py-2.5 font-semibold text-gray-800">{row.size}</td>
                            {columns.map((col) => (
                              <td key={col} className="border border-gray-200 px-4 py-2.5 text-center text-gray-600">
                                {row.measurements[col] !== undefined ? convertValue(row.measurements[col]) : "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    *This data was obtained from manually measuring the product, it may be off by 1-2 {unit}
                  </p>
                  {notes && (
                    <p className="text-xs text-gray-500 mt-2">{notes}</p>
                  )}
                </>
              )}

              {activeTab === "measure" && (
                <div className="flex gap-8">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-6">How to Measure</h4>
                    <div className="space-y-6">
                      {howToMeasure.map((item, index) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{item.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-48 flex-shrink-0">
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                      <svg viewBox="0 0 120 180" className="w-full h-auto max-h-64">
                        <ellipse cx="60" cy="25" rx="15" ry="18" fill="none" stroke="#374151" strokeWidth="2"/>
                        <path d="M45 43 L35 85 L40 160 L52 160 L60 100 L68 160 L80 160 L85 85 L75 43" fill="none" stroke="#374151" strokeWidth="2"/>
                        <path d="M35 55 L20 90" fill="none" stroke="#374151" strokeWidth="2"/>
                        <path d="M85 55 L100 90" fill="none" stroke="#374151" strokeWidth="2"/>
                        
                        <line x1="30" y1="48" x2="90" y2="48" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4"/>
                        <circle cx="30" cy="48" r="8" fill="white" stroke="#ef4444" strokeWidth="1.5"/>
                        <text x="30" y="52" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="bold">1</text>
                        
                        <line x1="30" y1="68" x2="90" y2="68" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4"/>
                        <circle cx="90" cy="68" r="8" fill="white" stroke="#ef4444" strokeWidth="1.5"/>
                        <text x="90" y="72" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="bold">2</text>
                        
                        <line x1="60" y1="43" x2="60" y2="95" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4"/>
                        <circle cx="60" cy="95" r="8" fill="white" stroke="#ef4444" strokeWidth="1.5"/>
                        <text x="60" y="99" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="bold">3</text>
                        
                        <line x1="85" y1="55" x2="100" y2="90" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4"/>
                        <circle cx="100" cy="90" r="8" fill="white" stroke="#ef4444" strokeWidth="1.5"/>
                        <text x="100" y="94" textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="bold">4</text>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
