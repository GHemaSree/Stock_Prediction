import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { stocksData } from "@/data/stockData";
import SignalsSummary from "@/components/SignalsSummary";
import { useAuth } from "@/contexts/AuthContext";
 

const StockAnalysis = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const stock = stocksData[symbol as keyof typeof stocksData];
  const isIN = /\.(NS|BO)$/i.test((stock?.symbol || symbol || '').toString());
  const currency = isIN ? '₹' : '$';

  // Model-driven stats state (inside component)
  const [latest, setLatest] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!symbol) return;
      try {
        setLoadingStats(true);
        setStatsError(null);
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const [latestRes, histRes, modelRes] = await Promise.all([
          fetch(`${base}/api/signals/${symbol}/latest`),
          fetch(`${base}/api/signals/${symbol}`),
          fetch(`${base}/api/model-status/${symbol}`),
        ]);
        const latestJson = await latestRes.json();
        const histJson = await histRes.json();
        const modelJson = await modelRes.json();
        if (!active) return;
        setLatest(latestJson?.data ?? null);
        setHistory(Array.isArray(histJson?.data) ? histJson.data : []);
        setModelStatus(modelJson ?? null);
      } catch (e: any) {
        if (!active) return;
        setStatsError("Failed to load model stats");
      } finally {
        if (active) setLoadingStats(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [symbol]);

  // Helper parsers
  const toNum = (v: any) => {
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  };

  // Compute recent window (last 7 rows chronologically)
  const recent = useMemo(() => {
    if (!history?.length) return [] as any[];
    const sorted = [...history].sort((a, b) => (a.Date > b.Date ? 1 : a.Date < b.Date ? -1 : 0));
    return sorted.slice(Math.max(0, sorted.length - 7));
  }, [history]);

  const stats = useMemo(() => {
    if (!latest) return null as any;
    const probUp = toNum(latest.ProbUp);
    const signal = latest.Signal as string | undefined;
    const volNorm = toNum(latest.Vol_norm);
    const latestPrice = toNum(latest.Price);

    const counts = { BUY: 0, SELL: 0, HOLD: 0 } as Record<string, number>;
    let sumProb = 0;
    let changePcts: number[] = [];
    let priceSeries: number[] = [];
    recent.forEach((r) => {
      const s = (r.Signal || "").toUpperCase();
      if (s in counts) counts[s] += 1;
      const p = toNum(r.ProbUp);
      if (Number.isFinite(p)) sumProb += p;
      const cp = toNum(r.ChangePct);
      if (Number.isFinite(cp)) changePcts.push(cp);
      const pr = toNum(r.Price);
      if (Number.isFinite(pr)) priceSeries.push(pr);
    });
    const avgProb = recent.length ? sumProb / recent.length : NaN;
    const meanChange = changePcts.length ? changePcts.reduce((a, b) => a + b, 0) / changePcts.length : 0;
    const volStd = changePcts.length
      ? Math.sqrt(changePcts.reduce((a, b) => a + Math.pow(b - meanChange, 2), 0) / changePcts.length)
      : NaN;
    // 5d momentum
    // 5d momentum removed

    // Labels
    const confLabel = !Number.isFinite(probUp)
      ? "-"
      : probUp < 0.52
      ? "Low"
      : probUp < 0.6
      ? "Medium"
      : "High";

    const volNormLabel = !Number.isFinite(volNorm)
      ? "-"
      : volNorm < 0.9
      ? "Below normal"
      : volNorm <= 1.1
      ? "Normal"
      : "Above normal";

    let volLabel = "-";
    if (Number.isFinite(volStd)) {
      volLabel = volStd < 0.8 ? "Calm" : volStd < 1.5 ? "Moderate" : "High";
    }

    return {
      date: latest.Date,
      probUp,
      signal,
      volNorm,
      latestPrice,
      counts,
      avgProb,
      volStd,
      confLabel,
      volNormLabel,
      volLabel,
    };
  }, [latest, recent]);

  // Model status and ticker info
  const [modelStatus, setModelStatus] = useState<any | null>(null);

  const tickerInfo = useMemo(() => {
    const info: any = {};
    // Sort history chronologically
    const sorted = [...history].sort((a, b) => (a.Date > b.Date ? 1 : a.Date < b.Date ? -1 : 0));
    const count = sorted.length;
    info.count = count;
    info.firstDate = count ? sorted[0].Date : null;
    info.lastDate = count ? sorted[count - 1].Date : null;

    // Today's snapshot (from latest)
    const toNum = (v: any) => {
      const n = typeof v === 'number' ? v : parseFloat(v ?? '');
      return Number.isFinite(n) ? n : NaN;
    };
    if (latest) {
      info.today = {
        price: toNum(latest.Price),
        changePct: toNum(latest.ChangePct),
        volume: toNum(latest.Volume),
        volNorm: toNum(latest.Vol_norm),
        probUp: toNum(latest.ProbUp),
        date: latest.Date,
      };
    }

    // Risk flags (derived only from existing fields)
    const changePcts = sorted
      .map((r) => toNum(r.ChangePct))
      .filter((x) => Number.isFinite(x)) as number[];
    const meanChange = changePcts.length ? changePcts.reduce((a, b) => a + b, 0) / changePcts.length : 0;
    const volStd = changePcts.length
      ? Math.sqrt(changePcts.reduce((a, b) => a + Math.pow(b - meanChange, 2), 0) / changePcts.length)
      : NaN;
    const lowConf = latest && Number.isFinite(info.today?.probUp)
      ? info.today.probUp >= 0.45 && info.today.probUp <= 0.55
      : false;
    const hiVolNorm = latest && Number.isFinite(info.today?.volNorm)
      ? info.today.volNorm > 1.1
      : false;
    const hiVolatility = Number.isFinite(volStd) ? volStd > 1.5 : false;
    info.risks = { lowConf, hiVolNorm, hiVolatility, volStd };

    // Signals consistency (last 30 entries)
    const last30 = sorted.slice(Math.max(0, sorted.length - 30));
    const total30 = last30.length || 1;
    const counts30 = { BUY: 0, HOLD: 0, SELL: 0 } as Record<string, number>;
    last30.forEach((r) => {
      const s = (r.Signal || '').toUpperCase();
      if (s in counts30) counts30[s] += 1;
    });
    info.consistency30 = {
      counts: counts30,
      pct: {
        BUY: Math.round((counts30.BUY / total30) * 100),
        HOLD: Math.round((counts30.HOLD / total30) * 100),
        SELL: Math.round((counts30.SELL / total30) * 100),
      },
    };

    return info;
  }, [history, latest]);

  if (!stock) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Stock Not Found</h1>
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleAction = async (action: 'BUY' | 'SELL') => {
    if (!stock) return;
    if (!user?.email) {
      toast({ title: 'Login required', description: 'Please log in to place an order.', variant: 'destructive' });
      return;
    }
    
    const latestNumericPrice = Number.isFinite(toNum(latest?.Price)) ? toNum(latest?.Price) : null;
    const orderPriceStr = latestNumericPrice != null ? `${currency}${latestNumericPrice.toFixed(2)}` : String(stock.price);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.email || undefined,
          symbol: stock.symbol,
          name: stock.name,
          type: action,
          quantity: 1,
          price: orderPriceStr,
          priceNum: latestNumericPrice ?? undefined,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to save order');
      toast({
        title: `${action} Order Placed`,
        description: `Your ${action.toLowerCase()} order for ${symbol} has been submitted.`,
      });
    } catch (e: any) {
      toast({
        title: 'Order failed',
        description: e?.message || 'Could not save order',
        variant: 'destructive',
      });
    }
  };

  const handleAddToWatchlist = async () => {
    // watchlist feature removed
  };

  const getActionButtons = () => {
    return (
      <div className="space-y-2">
        <Button className="w-full bg-gain hover:bg-gain/90" onClick={() => handleAction("BUY")}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Buy Stock
        </Button>
        <Button className="w-full" variant="destructive" onClick={() => handleAction("SELL")}>
          <TrendingDown className="h-4 w-4 mr-2" />
          Sell Stock
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-foreground">FinSight</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stock Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{symbol}</h1>
              <p className="text-lg text-muted-foreground">{stock.name}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {Number.isFinite(toNum(latest?.Price)) ? `${currency}${toNum(latest?.Price).toFixed(2)}` : '-'}
              </div>
              <div
                className={`text-lg ${
                  Number.isFinite(toNum(latest?.ChangePct))
                    ? toNum(latest?.ChangePct) >= 0
                      ? 'text-gain'
                      : 'text-loss'
                    : 'text-muted-foreground'
                }`}
              >
                {Number.isFinite(toNum(latest?.ChangePct))
                  ? `${toNum(latest?.ChangePct).toFixed(2)}%`
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stock Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Signals Summary (model-driven) */}
            <SignalsSummary symbol={stock.symbol} />

            {/* Price Information section removed */}

            {/* Snapshot & Risk (derived from signals.csv only) */}
            <Card>
              <CardHeader>
                <CardTitle>Snapshot & Risk</CardTitle>
                <CardDescription>Today snapshot, risk flags, consistency, freshness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {/* Today snapshot (avoid repeating header info) */}
                  <div>
                    <div className="text-muted-foreground mb-1">Today</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Price</div>
                      <div className="font-medium">{Number.isFinite(tickerInfo.today?.price) ? `${currency}${tickerInfo.today.price.toFixed(2)}` : '-'}</div>
                      <div>Change%</div>
                      <div className="font-medium">{Number.isFinite(tickerInfo.today?.changePct) ? `${tickerInfo.today.changePct.toFixed(2)}%` : '-'}</div>
                      <div>Volume</div>
                      <div className="font-medium">{Number.isFinite(tickerInfo.today?.volume) ? Math.round(tickerInfo.today.volume).toLocaleString() : '-'}</div>
                      <div>Vol_norm</div>
                      <div className="font-medium">{Number.isFinite(tickerInfo.today?.volNorm) ? tickerInfo.today.volNorm.toFixed(2) : '-'}</div>
                    </div>
                  </div>

                  {/* Risk flags */}
                  <div>
                    <div className="text-muted-foreground mb-1">Risk flags</div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li className={tickerInfo.risks?.lowConf ? 'text-amber-600' : 'text-muted-foreground'}>
                        Low confidence (ProbUp near 50%)
                      </li>
                      <li className={tickerInfo.risks?.hiVolNorm ? 'text-amber-600' : 'text-muted-foreground'}>
                        Above-normal volume (Vol_norm &gt; 1.1)
                      </li>
                      <li className={tickerInfo.risks?.hiVolatility ? 'text-amber-600' : 'text-muted-foreground'}>
                        High volatility (7d std &gt; 1.5)
                      </li>
                    </ul>
                  </div>

                  {/* Consistency (30d) */}
                  <div>
                    <div className="text-muted-foreground mb-1">Signals consistency (30d)</div>
                    <div className="flex justify-between">
                      <span>BUY</span>
                      <span className="font-medium">{tickerInfo.consistency30?.counts?.BUY ?? 0} ({tickerInfo.consistency30?.pct?.BUY ?? 0}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HOLD</span>
                      <span className="font-medium">{tickerInfo.consistency30?.counts?.HOLD ?? 0} ({tickerInfo.consistency30?.pct?.HOLD ?? 0}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SELL</span>
                      <span className="font-medium">{tickerInfo.consistency30?.counts?.SELL ?? 0} ({tickerInfo.consistency30?.pct?.SELL ?? 0}%)</span>
                    </div>
                  </div>

                  {/* Freshness */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data freshness</span>
                    <span className="font-medium">{tickerInfo.lastDate || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prediction Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge 
                    variant={stats?.signal === "BUY" ? "default" : stats?.signal === "SELL" ? "destructive" : "secondary"}
                    className="text-lg px-6 py-2"
                  >
                    {stats?.signal || "-"}
                  </Badge>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Confidence</span>
                    <span className="text-sm font-medium">
                      {stats && Number.isFinite(stats.probUp)
                        ? `${(stats.probUp * 100).toFixed(1)}%`
                        : `${stock.confidence}%`}
                    </span>
                  </div>
                  <Progress
                    value={stats && Number.isFinite(stats.probUp) ? stats.probUp * 100 : stock.confidence}
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  {getActionButtons()}
                </div>
              </CardContent>
            </Card>

            {/* Model-based Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Model-based Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingStats && (
                  <div className="text-sm text-muted-foreground">Loading model stats…</div>
                )}
                {statsError && (
                  <div className="text-sm text-red-500">{statsError}</div>
                )}
                {!loadingStats && !statsError && stats && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence (ProbUp)</span>
                      <span className="font-medium">
                        {Number.isFinite(stats.probUp) ? stats.probUp.toFixed(3) : "-"} ({stats.confLabel})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Signal (today)</span>
                      <span className="font-medium">{stats.signal || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume vs normal</span>
                      <span className="font-medium">
                        {Number.isFinite(stats.volNorm) ? stats.volNorm.toFixed(2) : "-"} ({stats.volNormLabel})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recent signals (7d)</span>
                      <span className="font-medium">
                        B:{stats.counts.BUY} H:{stats.counts.HOLD} S:{stats.counts.SELL}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg ProbUp (7d)</span>
                      <span className="font-medium">
                        {Number.isFinite(stats.avgProb) ? stats.avgProb.toFixed(3) : "-"}
                      </span>
                    </div>
                    {/* 5d momentum removed */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volatility (7d)</span>
                      <span className="font-medium">
                        {Number.isFinite(stats.volStd) ? stats.volStd.toFixed(2) : "-"} ({stats.volLabel})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data freshness</span>
                      <span className="font-medium">{stats.date || "-"}</span>
                    </div>
                  </>
                )}
                {!loadingStats && !statsError && !stats && (
                  <div className="text-sm text-muted-foreground">
                    No model data found for {symbol}. Make sure `logs/signals.csv` has entries for this ticker
                    and the backend is running at {import.meta.env.VITE_API_URL || "http://localhost:5000"}.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAnalysis;