"use client";

import type { ReactNode } from "react";
import { FileText, Tag, Layers, Scale, Box, Package } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageThreeProps = {
  product: PricedProduct;
};

type SpecRowProps = {
  icon: ReactNode;
  label: string;
  value: string | number | undefined;
  fallback?: string;
};

function SpecRow({ icon, label, value, fallback = "غير متوفر" }: SpecRowProps) {
  const displayValue = value !== undefined && value !== null && value !== "" ? value : fallback;
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className={`font-medium ${hasValue ? "text-gray-900" : "text-gray-400 italic"}`}>
          {displayValue}
        </p>
      </div>
    </div>
  );
}

function formatDimensions(length?: number, width?: number, height?: number): string | undefined {
  if (!length && !width && !height) return undefined;
  const parts = [];
  if (length) parts.push(`${length} سم`);
  if (width) parts.push(`${width} سم`);
  if (height) parts.push(`${height} سم`);
  return parts.join(" × ");
}

export default function PreviewPageThree({ product }: PreviewPageThreeProps) {
  const dimensions = formatDimensions(product.packLength, product.packWidth, product.packHeight);
  const hasDescription = product.description && product.description.trim().length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            مواصفات المنتج
          </h3>
        </div>

        <div className="p-5 space-y-1">
          <SpecRow
            icon={<Tag className="h-4 w-4 text-blue-600" />}
            label="الفئة"
            value={product.categoryName}
          />
          <SpecRow
            icon={<Layers className="h-4 w-4 text-blue-600" />}
            label="نوع المنتج"
            value={product.productType}
          />
          <SpecRow
            icon={<Package className="h-4 w-4 text-blue-600" />}
            label="المادة"
            value={product.material}
          />
          <SpecRow
            icon={<Scale className="h-4 w-4 text-blue-600" />}
            label="الوزن"
            value={product.productWeight ? `${product.productWeight} جم` : undefined}
          />
          <SpecRow
            icon={<Box className="h-4 w-4 text-blue-600" />}
            label="الأبعاد (الطول × العرض × الارتفاع)"
            value={dimensions}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            الوصف الكامل
          </h3>
        </div>

        <div className="p-5">
          {hasDescription ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          ) : (
            <p className="text-gray-400 italic">
              لا يوجد وصف متاح لهذا المنتج
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
