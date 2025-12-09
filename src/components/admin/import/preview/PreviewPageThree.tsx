"use client";

import type { ReactNode } from "react";
import { FileText, Ruler, Package, AlertCircle } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageThreeProps = {
  product: PricedProduct;
};

type SectionCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  iconColor?: string;
};

function SectionCard({ 
  title, 
  icon, 
  children, 
  gradientFrom = "from-blue-50", 
  gradientTo = "to-indigo-50",
  iconColor = "text-blue-600"
}: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} px-5 py-4 border-b border-gray-200`}>
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          {title}
        </h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-gray-400 italic text-center py-4">
      {message}
    </p>
  );
}

function HtmlContent({ html }: { html: string }) {
  return (
    <div 
      className="prose prose-sm max-w-none text-gray-700 leading-relaxed
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
        [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-right
        [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
        [&_img]:max-w-full [&_img]:h-auto [&_img]:my-2
        [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function PreviewPageThree({ product }: PreviewPageThreeProps) {
  const hasProductInfo = product.productInfo && product.productInfo.trim().length > 0;
  const hasSizeChartImages = product.sizeChartImages && product.sizeChartImages.length > 0;
  const hasPackingList = product.packingList && product.packingList.trim().length > 0;
  const hasProductNote = product.productNote && product.productNote.trim().length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Product Information Section */}
      <SectionCard
        title="معلومات المنتج"
        icon={<FileText className="h-5 w-5" />}
        gradientFrom="from-blue-50"
        gradientTo="to-indigo-50"
        iconColor="text-blue-600"
      >
        {hasProductInfo ? (
          <HtmlContent html={product.productInfo!} />
        ) : (
          <EmptyState message="لا توجد معلومات متاحة" />
        )}
      </SectionCard>

      {/* Size Chart Section */}
      <SectionCard
        title="جدول المقاسات"
        icon={<Ruler className="h-5 w-5" />}
        gradientFrom="from-purple-50"
        gradientTo="to-pink-50"
        iconColor="text-purple-600"
      >
        {hasSizeChartImages ? (
          <div className="space-y-4">
            {product.sizeChartImages!.map((imgUrl, index) => (
              <div key={index} className="rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={imgUrl}
                  alt={`جدول المقاسات ${index + 1}`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="لا يوجد جدول مقاسات متاح" />
        )}
      </SectionCard>

      {/* Packing List Section */}
      <SectionCard
        title="قائمة التعبئة"
        icon={<Package className="h-5 w-5" />}
        gradientFrom="from-green-50"
        gradientTo="to-emerald-50"
        iconColor="text-green-600"
      >
        {hasPackingList ? (
          <HtmlContent html={product.packingList!} />
        ) : (
          <EmptyState message="لا توجد قائمة تعبئة متاحة" />
        )}
      </SectionCard>

      {/* Notes Section */}
      <SectionCard
        title="ملاحظات"
        icon={<AlertCircle className="h-5 w-5" />}
        gradientFrom="from-amber-50"
        gradientTo="to-orange-50"
        iconColor="text-amber-600"
      >
        {hasProductNote ? (
          <HtmlContent html={product.productNote!} />
        ) : (
          <EmptyState message="لا توجد ملاحظات متاحة" />
        )}
      </SectionCard>
    </div>
  );
}
