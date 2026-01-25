"use client";

import { useFormState, useFormStatus } from "react-dom";
import { removeItem, updateItemQuantity, moveToFavorites } from "@/lib/cart-actions";
import { formatCurrency } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useCartCount } from "@/components/cart/CartCountProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Heart } from "lucide-react";

function SubmitButton({ children, className, disabled }: { children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {children}
    </button>
  );
}

interface CartItemRowProps {
  item: CartItemType;
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const [removeMessage, removeAction] = useFormState(removeItem, null);
  const [updateMessage, updateAction] = useFormState(updateItemQuantity, null);
  const [favoritesMessage, favoritesAction] = useFormState(moveToFavorites, null);
  const { product, variant } = item;
  const { setCount } = useCartCount();
  const [isRemoved, setIsRemoved] = useState(false);
  const [isSelected, setIsSelected] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleSelectAll = (e: CustomEvent<{ selected: boolean }>) => {
      setIsSelected(e.detail.selected);
    };
    
    window.addEventListener('cart-select-all', handleSelectAll as EventListener);
    return () => {
      window.removeEventListener('cart-select-all', handleSelectAll as EventListener);
    };
  }, []);

  useEffect(() => {
    if (removeMessage?.success && typeof removeMessage.count === 'number') {
      setCount(removeMessage.count);
      setIsRemoved(true);
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  }, [removeMessage, setCount, router]);

  useEffect(() => {
    if (updateMessage?.success && typeof updateMessage.count === 'number') {
      setCount(updateMessage.count);
      router.refresh();
    }
  }, [updateMessage, setCount, router]);

  useEffect(() => {
    if (favoritesMessage?.success && typeof favoritesMessage.count === 'number') {
      setCount(favoritesMessage.count);
      setIsRemoved(true);
      const event = new CustomEvent('show-toast', {
        detail: { message: 'Moved to favorites!', type: 'success' }
      });
      window.dispatchEvent(event);
      setTimeout(() => {
        router.refresh();
      }, 100);
    } else if (favoritesMessage?.error) {
      const event = new CustomEvent('show-toast', {
        detail: { message: favoritesMessage.error, type: 'error' }
      });
      window.dispatchEvent(event);
    }
  }, [favoritesMessage, setCount, router]);

  if (!product || isRemoved) {
    return null;
  }

  const currentPrice = (variant && variant.price !== null && variant.price !== undefined)
    ? variant.price!
    : product.price;
  
  const originalPrice = (product as any).compare_at_price || product.price;
  const hasDiscount = originalPrice > currentPrice;
  const discountPercent = hasDiscount ? Math.round((1 - currentPrice / originalPrice) * 100) : 0;

  // Parse color and size from variantName (e.g., "Rock green-M" → color: "Rock green", size: "M")
  // Pattern: Everything before the LAST hyphen is color, after is size
  const parseVariantName = (variantName: string | null | undefined): { color: string | null; size: string | null } => {
    if (!variantName) return { color: null, size: null };
    
    // Split by last hyphen only (handles multi-word colors like "Rock green")
    const lastHyphenIdx = variantName.lastIndexOf('-');
    if (lastHyphenIdx > 0 && lastHyphenIdx < variantName.length - 1) {
      const color = variantName.slice(0, lastHyphenIdx).trim();
      const size = variantName.slice(lastHyphenIdx + 1).trim();
      return { color, size };
    }
    
    // No hyphen - might be just a color or just a size
    return { color: variantName.trim(), size: null };
  };

  const parsed = parseVariantName(item.variantName);
  // Priority: 1) Stored selectedColor/selectedSize, 2) Parsed from variantName, 3) From variant row
  const color = item.selectedColor || parsed.color || (variant?.option_name === 'Color' ? variant.option_value : null);
  const size = item.selectedSize || parsed.size || (variant?.option_name === 'Size' ? variant.option_value : (variant?.option_value || null));

  // Get available colors from product for positional matching
  const availableColors: string[] = (product as any).available_colors || [];

  // Get color-specific image
  const getColorImage = (): string => {
    const defaultImage = product.images?.[0] || "/placeholder.svg";
    
    if (!color) return defaultImage;
    
    // Priority 1: variant's image_url (set by getCartItemsBySessionId based on color variant)
    if (variant?.image_url) return variant.image_url;
    
    // Priority 2: color_image_map from product (if exists)
    const colorImageMap = (product as any).color_image_map;
    if (colorImageMap && typeof colorImageMap === 'object') {
      if (colorImageMap[color]) return colorImageMap[color];
      const colorLower = color.toLowerCase();
      for (const [key, url] of Object.entries(colorImageMap)) {
        if (key.toLowerCase() === colorLower && typeof url === 'string') {
          return url;
        }
      }
    }
    
    // Priority 3: URL-based matching (color name in image URL)
    if (product.images && product.images.length > 0) {
      const colorNorm = color.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (colorNorm.length >= 3) {
        const matchingImage = product.images.find((img: string) => {
          const urlLower = img.toLowerCase();
          return urlLower.includes(colorNorm) || urlLower.includes(color.toLowerCase().replace(/ /g, '-'));
        });
        if (matchingImage) return matchingImage;
      }
    }
    
    // Priority 4: Positional matching - Try to match color index to image
    // CJ products often have color images at the START of the images array
    if (availableColors.length > 0 && product.images && product.images.length >= availableColors.length) {
      const colorIdx = availableColors.findIndex((c: string) => 
        c.toLowerCase() === color.toLowerCase()
      );
      if (colorIdx >= 0 && product.images[colorIdx]) {
        return product.images[colorIdx];
      }
    }
    
    return defaultImage;
  };

  const productImage = getColorImage();

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors">
      {/* Checkbox */}
      <div className="col-span-1 flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => setIsSelected(e.target.checked)}
          className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
        />
      </div>
      
      {/* Product Info */}
      <div className="col-span-5 flex items-start gap-3">
        {/* Product Image - Clickable */}
        <Link 
          href={`/product/${product.slug}`}
          className="relative flex-shrink-0 group"
        >
          <div className="relative w-20 h-20 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
            <Image 
              src={productImage} 
              alt={product.title} 
              fill 
              sizes="80px" 
              className="object-cover group-hover:scale-105 transition-transform duration-200" 
            />
          </div>
          {/* Flash Sale Badge */}
          {hasDiscount && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
              Flash Sale
            </span>
          )}
        </Link>
        
        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <Link 
            href={`/product/${product.slug}`}
            className="block font-medium text-gray-900 hover:text-red-600 transition-colors line-clamp-2 text-sm"
          >
            {product.title}
          </Link>
          
          {/* Color & Size */}
          <div className="mt-1.5 space-y-0.5">
            {color && (
              <p className="text-xs text-gray-500">
                Color - <span className="text-gray-700">{color}</span>
              </p>
            )}
            {size && (
              <p className="text-xs text-gray-500">
                Size - <span className="text-gray-700">{size}</span>
              </p>
            )}
            {/* Debug: Show variantName if no color/size parsed */}
            {!color && !size && item.variantName && (
              <p className="text-xs text-gray-500">
                Variant: <span className="text-gray-700">{item.variantName}</span>
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Unit Price */}
      <div className="col-span-2 text-center">
        {hasDiscount && (
          <p className="text-xs text-gray-400 line-through">{formatCurrency(originalPrice)}</p>
        )}
        <p className="text-red-600 font-semibold">{formatCurrency(currentPrice)}</p>
        {hasDiscount && (
          <p className="text-xs text-red-500">-{discountPercent}%</p>
        )}
      </div>
      
      {/* Quantity & Actions */}
      <div className="col-span-4">
        <div className="flex flex-col items-center gap-2">
          {/* Quantity Controls */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <form action={updateAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="quantity" value={Math.max(0, item.quantity - 1)} />
              <SubmitButton 
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                disabled={item.quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </SubmitButton>
            </form>
            
            <span className="w-10 text-center text-sm font-medium text-gray-900 border-x border-gray-300">
              {item.quantity}
            </span>
            
            <form action={updateAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="quantity" value={item.quantity + 1} />
              <SubmitButton className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                <Plus className="w-4 h-4" />
              </SubmitButton>
            </form>
          </div>
          
          {/* Action Links */}
          <div className="flex items-center gap-3 text-xs">
            <form action={removeAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <SubmitButton className="text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                Delete
              </SubmitButton>
            </form>
            
            <span className="text-gray-300">|</span>
            
            <form action={favoritesAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <SubmitButton className="text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Move to favorite
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
