import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={{ pathname: `/products/${product.id}` }} passHref>
      <Card className="h-full flex flex-col overflow-hidden transition-shadow hover:shadow-lg cursor-pointer">
        <CardHeader className="p-0">
          <div className="aspect-square relative">
            <Image
              src={product.images?.[0] || '/placeholder.svg'}
              alt={product.title}
              fill
              className="object-cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg font-semibold leading-tight mb-1">{product.title}</CardTitle>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="text-base font-bold text-brand">{formatCurrency(product.price)}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}
