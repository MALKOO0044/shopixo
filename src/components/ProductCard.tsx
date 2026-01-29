// DEPRECATED: Use '@/components/product-card' instead. This wrapper delegates to the canonical component.
import { Product } from '@/lib/types';
import RealProductCard from './product-card';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return <RealProductCard product={product} />;
}
