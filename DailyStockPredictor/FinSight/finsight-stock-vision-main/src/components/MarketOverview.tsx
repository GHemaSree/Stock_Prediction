import { useEffect, useMemo, useState, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { fetchLatestPredictions, LatestPredictionItem } from "@/services/predictions";
import { useNavigate } from "react-router-dom";

function Section({ title, description, children }: { title: ReactNode; description: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function MarketOverview() {
  const [items, setItems] = useState<LatestPredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchLatestPredictions();
        if (!mounted) return;
        setItems(res.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const mostActive = useMemo(() => {
    return [...items]
      .filter((x) => typeof x.volume === 'number')
      .sort((a, b) => (b.volume as number) - (a.volume as number))
      .slice(0, 5);
  }, [items]);

  const topGainers = useMemo(() => {
    return [...items]
      .filter((x) => typeof x.changePct === 'number' && (x.changePct as number) > 0)
      .sort((a, b) => (b.changePct as number) - (a.changePct as number))
      .slice(0, 5);
  }, [items]);

  const topLosers = useMemo(() => {
    return [...items]
      .filter((x) => typeof x.changePct === 'number' && (x.changePct as number) < 0)
      .sort((a, b) => (a.changePct as number) - (b.changePct as number))
      .slice(0, 5);
  }, [items]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading market overview...</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;

  const Row = (x: LatestPredictionItem) => {
    const isIN = /\.(NS|BO)$/i.test(x.ticker || '');
    const currency = isIN ? '₹' : '$';
    const priceStr = typeof x.price === 'number' ? `${currency}${x.price.toFixed(2)}` : '-';
    const changeClass = typeof x.changePct === 'number' && x.changePct >= 0 ? 'text-gain' : 'text-loss';
    return (
      <div key={x.ticker} className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/stock/${x.ticker}`)}>
        <div>
          <div className="font-medium">{x.ticker}</div>
          <div className="text-sm text-muted-foreground">{x.signal || 'HOLD'}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">{priceStr}</div>
          <div className={`text-sm ${changeClass}`}>{x.changeFmt ?? '-'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Section title={<><Activity className="h-5 w-5 mr-2 inline"/>Most Active</>} description="Highest trading volume">
        <div className="space-y-3">
          {mostActive.map(Row)}
        </div>
      </Section>

      <Section title={<><TrendingUp className="h-5 w-5 mr-2 inline text-gain"/>Top Gainers</>} description="Biggest percentage gains">
        <div className="space-y-3">
          {topGainers.length ? topGainers.map(Row) : (
            <div className="text-sm text-muted-foreground">No gainers today.</div>
          )}
        </div>
      </Section>

      <Section title={<><TrendingDown className="h-5 w-5 mr-2 inline text-loss"/>Top Losers</>} description="Biggest percentage losses">
        <div className="space-y-3">
          {topLosers.length ? topLosers.map(Row) : (
            <div className="text-sm text-muted-foreground">No losers today.</div>
          )}
        </div>
      </Section>
    </div>
  );
}
