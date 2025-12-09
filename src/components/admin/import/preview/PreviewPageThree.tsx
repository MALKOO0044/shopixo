"use client";

import type { ReactNode } from "react";
import { FileText, Ruler, Package, AlertCircle, Info } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageThreeProps = {
  product: PricedProduct;
};

type SectionCardProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  bgColor?: string;
  borderColor?: string;
  iconBgColor?: string;
  iconColor?: string;
  fullWidth?: boolean;
};

function SectionCard({ 
  title, 
  icon, 
  children, 
  bgColor = "bg-white",
  borderColor = "border-gray-200",
  iconBgColor = "bg-blue-100",
  iconColor = "text-blue-600",
  fullWidth = false,
}: SectionCardProps) {
  return (
    <div className={`${bgColor} rounded-xl border ${borderColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className={`${iconBgColor} ${iconColor} p-2 rounded-lg`}>
          {icon}
        </div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function HtmlContent({ html }: { html: string }) {
  return (
    <div 
      className="prose prose-sm max-w-none text-gray-700 leading-relaxed
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm
        [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-right [&_th]:font-semibold
        [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2
        [&_img]:max-w-full [&_img]:h-auto [&_img]:my-2 [&_img]:rounded-lg
        [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4
        [&_strong]:font-semibold [&_strong]:text-gray-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function NoDataFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Info className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد معلومات إضافية</h3>
      <p className="text-gray-400 text-center text-sm max-w-md">
        لا تتوفر معلومات تفصيلية لهذا المنتج من المورد. يمكنك إضافة المعلومات يدوياً بعد الاستيراد.
      </p>
    </div>
  );
}

export default function PreviewPageThree({ product }: PreviewPageThreeProps) {
  const hasProductInfo = product.productInfo && product.productInfo.trim().length > 0;
  const hasSizeChartImages = product.sizeChartImages && product.sizeChartImages.length > 0;
  const hasPackingList = product.packingList && product.packingList.trim().length > 0;
  const hasProductNote = product.productNote && product.productNote.trim().length > 0;
  
  const hasAnyContent = hasProductInfo || hasSizeChartImages || hasPackingList || hasProductNote;

  if (!hasAnyContent) {
    return <NoDataFallback />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" dir="rtl">
      {hasProductInfo && (
        <SectionCard
          title="معلومات المنتج"
          icon={<FileText className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-blue-100"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          fullWidth={!hasSizeChartImages && !hasPackingList && !hasProductNote}
        >
          <HtmlContent html={product.productInfo!} />
        </SectionCard>
      )}

      {hasSizeChartImages && (
        <SectionCard
          title="جدول المقاسات"
          icon={<Ruler className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-purple-100"
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          fullWidth={product.sizeChartImages!.length > 1}
        >
          <div className={`grid gap-3 ${product.sizeChartImages!.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {product.sizeChartImages!.map((imgUrl, index) => (
              <div key={index} className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <img
                  src={imgUrl}
                  alt={`جدول المقاسات ${index + 1}`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {hasPackingList && (
        <SectionCard
          title="محتويات العبوة"
          icon={<Package className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-green-100"
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        >
          <HtmlContent html={product.packingList!} />
        </SectionCard>
      )}

      {hasProductNote && (
        <SectionCard
          title="ملاحظات المنتج"
          icon={<AlertCircle className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-amber-100"
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        >
          <HtmlContent html={product.productNote!} />
        </SectionCard>
      )}
    </div>
  );
}
