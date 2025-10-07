import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { useOrders } from "@/contexts/OrderContext";
import { stocksData } from "@/data/stockData";
import TrendChart from "@/components/TrendChart";
import { useAuth } from "@/contexts/AuthContext";

const StockAnalysis = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const { addOrder } = useOrders();

  const stock = stocksData[symbol as keyof typeof stocksData];

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

  const handleAction = (action: 'BUY' | 'SELL') => {
    if (!stock) return;
    
    addOrder({
      symbol: stock.symbol,
      name: stock.name,
      type: action,
      quantity: 1,
      price: stock.price,
    });
    
    toast({
      title: `${action} Order Placed`,
      description: `Your ${action.toLowerCase()} order for ${symbol} has been submitted.`,
    });
  };

  const handleAddToWatchlist = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol: stock.symbol }),
      });
      if (res.ok) {
        toast({
          title: "Added successfully",
          description: "Check your profile",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: "Could not add to watchlist",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not add to watchlist",
        variant: "destructive",
      });
    }
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
        <Button
          className="w-full mt-2"
          variant="secondary"
          onClick={handleAddToWatchlist}
        >
          Add to Watchlist
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
              <div className="text-3xl font-bold">{stock.price}</div>
              <div className={`text-lg ${stock.change.startsWith('+') ? 'text-gain' : 'text-loss'}`}>
                {stock.change}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stock Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trend Chart */}
            <TrendChart stockSymbol={stock.symbol} />

            {/* Price Info */}
            <Card>
              <CardHeader>
                <CardTitle>Price Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Day High</p>
                    <p className="text-lg font-semibold">{stock.dayHigh}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Day Low</p>
                    <p className="text-lg font-semibold">{stock.dayLow}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Volume</p>
                    <p className="text-lg font-semibold">{stock.volume}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target Price</p>
                    <p className="text-lg font-semibold text-gain">{stock.targetPrice}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis & Reasoning</CardTitle>
                <CardDescription>
                  Based on technical indicators, market sentiment, and financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="font-semibold">Key Factors:</h4>
                  <ul className="space-y-2">
                    {stock.reasons.map((reason, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
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
                    variant={stock.prediction === "BUY" ? "default" : stock.prediction === "SELL" ? "destructive" : "secondary"}
                    className="text-lg px-6 py-2"
                  >
                    {stock.prediction}
                  </Badge>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Confidence</span>
                    <span className="text-sm font-medium">{stock.confidence}%</span>
                  </div>
                  <Progress value={stock.confidence} className="h-2" />
                </div>

                <div className="space-y-2">
                  {getActionButtons()}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-medium">₹2.8T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className="font-medium">28.5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">52W High</span>
                  <span className="font-medium">₹15,234.80</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">52W Low</span>
                  <span className="font-medium">₹9,876.25</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAnalysis;