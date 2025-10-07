import { useEffect, useState } from "react";
import StockCard from "@/components/StockCard";
import { fetchLatestPredictions, LatestPredictionItem } from "@/services/predictions";

type StockCardModel = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  prediction: string;
  confidence: number;
};

export default function LatestSignals() {
  const [date, setDate] = useState<string | null>(null);
  const [items, setItems] = useState<LatestPredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchLatestPredictions();
        if (!mounted) return;
        setDate(res.date);
        setItems(res.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load predictions");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading latest predictions...</div>;
  }
  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">No predictions found.</div>;
  }

  const cards: StockCardModel[] = items.map((it) => {
    const priceStrNum = typeof it.price === "number" && !Number.isNaN(it.price)
      ? it.price.toFixed(2)
      : null;
    const isIN = /\.(NS|BO)$/i.test(it.ticker || "");
    const currency = isIN ? "₹" : "$";
    const priceStr = priceStrNum ? `${currency}${priceStrNum}` : "-";
    const changeStr = it.changeFmt ?? "-";
    const isPos = typeof it.changePct === "number"
      ? it.changePct >= 0
      : (it.signal || "HOLD") === "BUY";
    return {
      symbol: it.ticker,
      name: it.ticker,
      price: priceStr,
      change: changeStr,
      isPositive: isPos,
      prediction: (it.signal || "HOLD") as string,
      confidence: it.probUp != null ? Math.round(Math.abs(it.probUp) * 100) : 0,
    };
  });

  return (
    <div>
      {date && (
        <div className="text-sm text-muted-foreground mb-4">Latest Date: {date}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <StockCard key={c.symbol} stock={c} />
        ))}
      </div>
    </div>
  );
}
