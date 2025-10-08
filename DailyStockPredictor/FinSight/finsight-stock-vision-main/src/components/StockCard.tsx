import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  prediction: string;
  confidence: number;
}

interface StockCardProps {
  stock: Stock;
}

const StockCard = ({ stock }: StockCardProps) => {
  const navigate = useNavigate();

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case "BUY":
        return "bg-gain hover:bg-gain/90 text-white";
      case "SELL":
        return "bg-loss hover:bg-loss/90 text-white";
      default:
        // HOLD
        return "bg-muted-foreground hover:bg-muted-foreground/90 text-background";
    }
  };

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case "BUY":
        return <TrendingUp className="h-4 w-4" />;
      case "SELL":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/stock/${stock.symbol}`)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{stock.symbol}</CardTitle>
            <CardDescription>{stock.name}</CardDescription>
          </div>
          <Badge 
            variant="secondary" 
            className={`${stock.isPositive ? 'bg-gain/10 text-gain border-gain/20' : 'bg-loss/10 text-loss border-loss/20'}`}
          >
            {stock.change}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-bold">{stock.price}</div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Prediction</span>
            <span className="text-sm font-medium">{stock.confidence}% confidence</span>
          </div>
          <Progress value={stock.confidence} className="h-2" />
        </div>

        <Button 
          className={`w-full ${getPredictionColor(stock.prediction)}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/stock/${stock.symbol}`);
          }}
        >
          {getPredictionIcon(stock.prediction)}
          <span className="ml-2">{stock.prediction}</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default StockCard;