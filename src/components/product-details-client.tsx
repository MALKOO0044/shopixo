"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";
import AddToCart from "@/components/add-to-cart";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// --- Sub-components (kept from original page) ---
function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <Image src={selectedImage} alt={`Main image for ${title}`} fill className="object-cover" />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-4">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(image)}
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-md transition-all",
              "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              selectedImage === image ? "ring-2 ring-primary" : "hover:opacity-80"
            )}
          >
            <Image src={image} alt={`Thumbnail ${index + 1} for ${title}`} fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductOptions({ variants, onOptionChange }: { variants: any[]; onOptionChange: (name: string, value: string) => void }) {
  return (
    <div className="mt-6 space-y-6">
      {variants.map((variant) => (
        <div key={variant.name}>
          <Label className="text-sm font-medium text-foreground">{variant.name}</Label>
          <RadioGroup
            defaultValue={variant.options[0]}
            className="mt-2 flex flex-wrap gap-2"
            onValueChange={(value: string) => onOptionChange(variant.name, value)}
            name={variant.name}
          >
            {variant.options.map((option: string) => (
              <div key={option}>
                <RadioGroupItem value={option} id={`${variant.name}-${option}`} className="sr-only" />
                <Label
                  htmlFor={`${variant.name}-${option}`}
                  className="cursor-pointer rounded-md border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
  );
}

// --- Main Client Component ---
export default function ProductDetailsClient({ product, children }: { product: Product, children?: React.ReactNode }) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initialOptions: Record<string, string> = {};
    product.variants?.forEach((v) => {
      initialOptions[v.name] = v.options[0];
    });
    return initialOptions;
  });

  const handleOptionChange = (name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery images={product.images} title={product.title} />
      <div>
        <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-2xl font-semibold text-primary">{formatCurrency(product.price)}</span>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            isOutOfStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          )}>
            {isOutOfStock ? 'Out of Stock' : 'In Stock'}
          </span>
        </div>
        <p className="mt-4 text-muted-foreground">{product.description}</p>
        
        {product.variants?.length ? (
          <ProductOptions variants={product.variants} onOptionChange={handleOptionChange} />
        ) : null}

        <div className="mt-8">
          <AddToCart productId={product.id} selectedOptions={selectedOptions} disabled={isOutOfStock} />
        </div>

        {/* Price comparison component will be passed as a child */}
        {children}

        <div className="mt-8 text-sm text-muted-foreground">
          <p>• Free shipping on orders over $100</p>
          <p>• 30-day money-back guarantee</p>
          <p>• Secure checkout via Stripe & PayPal</p>
        </div>
      </div>
    </div>
  );
}
