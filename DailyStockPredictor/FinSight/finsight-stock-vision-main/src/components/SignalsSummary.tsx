import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SignalsSummaryProps {
  symbol: string;
}

interface SignalRow {
  Date: string;
  Ticker: string;
  ProbUp: string | number;
  Action: string | number;
  Signal: string;
  Price: string | number;
  ChangePct?: string | number;
  Volume?: string | number;
  Vol_norm?: string | number;
}

const pillColor = (signal: string) => {
  switch ((signal || "").toUpperCase()) {
    case "BUY":
      return "bg-gain";
    case "SELL":
      return "bg-loss";
    default:
      return "bg-muted-foreground";
  }
};

const SignalsSummary: React.FC<SignalsSummaryProps> = ({ symbol }) => {
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!symbol) return;
      try {
        setLoading(true);
        setError(null);
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${base}/api/signals/${symbol}`);
        const json = await res.json();
        if (!active) return;
        const data = Array.isArray(json?.data) ? (json.data as SignalRow[]) : [];
        setRows(data);
      } catch (e) {
        if (!active) return;
        setError("Failed to load signals");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [symbol]);

  const last7 = useMemo(() => rows.slice(Math.max(0, rows.length - 7)), [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Signals Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="text-sm text-muted-foreground">No data available.</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-4">
            {/* Last 7 entries table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Signal</th>
                    <th className="py-2 pr-4">ProbUp</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Change%</th>
                    <th className="py-2 pr-4">Vol norm</th>
                  </tr>
                </thead>
                <tbody>
                  {last7.map((r, idx) => {
                    const prob = typeof r.ProbUp === "number" ? r.ProbUp : parseFloat(r.ProbUp as string);
                    const price = typeof r.Price === "number" ? r.Price : parseFloat(r.Price as string);
                    const ch = typeof r.ChangePct === "number" ? r.ChangePct : parseFloat((r.ChangePct as string) || "");
                    const vn = typeof r.Vol_norm === "number" ? r.Vol_norm : parseFloat((r.Vol_norm as string) || "");
                    return (
                      <tr key={`${r.Date}-${idx}`} className="border-t border-border">
                        <td className="py-2 pr-4">{r.Date}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-0.5 rounded text-xs text-background ${pillColor(r.Signal)}`}>{r.Signal}</span>
                        </td>
                        <td className="py-2 pr-4">{Number.isFinite(prob) ? (prob * 100).toFixed(1) + "%" : "-"}</td>
                        <td className="py-2 pr-4">{Number.isFinite(price) ? price.toFixed(2) : "-"}</td>
                        <td className="py-2 pr-4">{Number.isFinite(ch) ? ch.toFixed(2) + "%" : "-"}</td>
                        <td className="py-2 pr-4">{Number.isFinite(vn) ? vn.toFixed(2) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalsSummary;
