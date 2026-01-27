"use client";

import type { ReactNode } from "react";
import { FileText, Ruler, Package, AlertCircle, Info, BookOpen, List } from "lucide-react";
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

function NoDataFallback({ product }: { product?: PricedProduct }) {
  // Even with no structured data, show basic info from product fields if available
  const basicInfo: string[] = [];
  if (product?.material) basicInfo.push(`Material: ${product.material}`);
  if (product?.productWeight) basicInfo.push(`Weight: ${product.productWeight}g`);
  if (product?.packLength && product?.packWidth && product?.packHeight) {
    basicInfo.push(`Dimensions: ${product.packLength} × ${product.packWidth} × ${product.packHeight} cm`);
  }
  if (product?.categoryName) basicInfo.push(`Category: ${product.categoryName}`);
  if (product?.hsCode) basicInfo.push(`HS Code: ${product.hsCode}`);
  if (product?.originCountry) basicInfo.push(`Origin Country: ${product.originCountry}`);

  if (basicInfo.length > 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
            <Info className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Basic Information</h3>
        </div>
        <div className="space-y-2">
          {basicInfo.map((info, idx) => (
            <p key={idx} className="text-gray-700 text-sm">{info}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="bg-gray-100 p-4 rounded-full mb-4">
        <Info className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Additional Information</h3>
      <p className="text-gray-400 text-center text-sm max-w-md">
        Detailed information for this product is not available from the supplier. You can add information manually after import.
      </p>
    </div>
  );
}

export default function PreviewPageThree({ product }: PreviewPageThreeProps) {
  const hasDescription = product.description && product.description.trim().length > 0;
  const hasOverview = product.overview && product.overview.trim().length > 0;
  const hasProductInfo = product.productInfo && product.productInfo.trim().length > 0;
  const hasSizeInfo = product.sizeInfo && product.sizeInfo.trim().length > 0;
  const hasSizeChartImages = product.sizeChartImages && product.sizeChartImages.length > 0;
  const hasProductNote = product.productNote && product.productNote.trim().length > 0;
  const hasPackingList = product.packingList && product.packingList.trim().length > 0;
  
  const hasAnyContent = hasDescription || hasOverview || hasProductInfo || hasSizeInfo || hasSizeChartImages || hasProductNote || hasPackingList;

  if (!hasAnyContent) {
    return <NoDataFallback product={product} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {hasDescription && (
        <SectionCard
          title="Product Description"
          icon={<BookOpen className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-indigo-100"
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
          fullWidth
        >
          <HtmlContent html={product.description!} />
        </SectionCard>
      )}

      {hasOverview && (
        <SectionCard
          title="Overview"
          icon={<List className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-teal-100"
          iconBgColor="bg-teal-50"
          iconColor="text-teal-600"
        >
          <HtmlContent html={product.overview!} />
        </SectionCard>
      )}

      {hasProductInfo && (
        <SectionCard
          title="Product Information"
          icon={<FileText className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-blue-100"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        >
          <HtmlContent html={product.productInfo!} />
        </SectionCard>
      )}

      {(hasSizeInfo || hasSizeChartImages) && (
        <SectionCard
          title="Size Information"
          icon={<Ruler className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-purple-100"
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          fullWidth={hasSizeChartImages && (product.sizeChartImages?.length ?? 0) > 1}
        >
          <div className="space-y-4">
            {hasSizeInfo && (
              <HtmlContent html={product.sizeInfo!} />
            )}
            {hasSizeChartImages && (
              <div className={`grid gap-3 ${(product.sizeChartImages?.length ?? 0) > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {product.sizeChartImages!.map((imgUrl, index) => (
                  <div key={index} className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    <img
                      src={imgUrl}
                      alt={`Size Chart ${index + 1}`}
                      className="w-full h-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {hasProductNote && (
        <SectionCard
          title="Product Notes"
          icon={<AlertCircle className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-amber-100"
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        >
          <HtmlContent html={product.productNote!} />
        </SectionCard>
      )}

      {hasPackingList && (
        <SectionCard
          title="Package Contents"
          icon={<Package className="h-5 w-5" />}
          bgColor="bg-white"
          borderColor="border-green-100"
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        >
          <HtmlContent html={product.packingList!} />
        </SectionCard>
      )}
    </div>
  );
}
