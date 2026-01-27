import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { formatCurrency } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

type CompetitorPrice = {
  id: number;
  competitor_name: string;
  price: number;
  url: string | null;
  last_updated: string;
};

async function getCompetitorPrices(productId: number) {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from("competitor_prices")
    .select<"*", CompetitorPrice>("*")
    .eq("product_id", productId)
    .order("price", { ascending: true });

  if (error) {
    console.error("Error fetching competitor prices:", error);
    return [];
  }
  return data;
}

export default async function PriceComparison({ productId }: { productId: number }) {
  const prices = await getCompetitorPrices(productId);

  if (prices.length === 0) {
    return null; // Don't render anything if there are no prices to compare
  }

  return (
    <div className="mt-8 rounded-lg border bg-card p-4">
      <h3 className="text-lg font-semibold text-foreground">Price Comparison</h3>
      <ul className="mt-4 space-y-3">
        {prices.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.competitor_name}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{formatCurrency(item.price)}</span>
              {item.url && item.url !== '#' && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Visit site</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
