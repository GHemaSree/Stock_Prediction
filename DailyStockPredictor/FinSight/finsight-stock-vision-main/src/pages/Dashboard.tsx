import { useState } from "react";
import { Search, User, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import StockCard from "@/components/StockCard";
import UserProfileModal from "@/components/UserProfileModal";
import { stocksData, dashboardStocks } from "@/data/stockData";
import LatestSignals from "@/components/LatestSignals";
import MarketOverview from "@/components/MarketOverview";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchLower = searchQuery.toLowerCase().trim();
    
    // Map search queries to stock symbols
    const stockMapping: Record<string, string> = {
      'apple': 'AAPL',
      'aapl': 'AAPL',
      'google': 'GOOGL',
      'googl': 'GOOGL',
      'alphabet': 'GOOGL',
      'microsoft': 'MSFT',
      'msft': 'MSFT',
      'wipro': 'WIPRO',
      'tcs': 'TCS',
      'tata consultancy services': 'TCS',
      'itc': 'ITC',
      'reliance': 'RELIANCE',
      'reliance industries': 'RELIANCE',
      'hdfc': 'HDFC',
      'hdfc bank': 'HDFC'
    };

    const symbol = stockMapping[searchLower];
    if (symbol) {
      navigate(`/stock/${symbol}`);
    } else {
      toast({
        title: "Stock Not Found",
        description: "Try searching for Apple, Google, Microsoft, Wipro, TCS, ITC, Reliance, or HDFC.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-foreground">FinSight</h1>
            </div>
          </div>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search stocks (AAPL, GOOGL, MSFT, WIPRO, TCS, ITC...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsProfileOpen(true)}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Featured Stocks Analysis (shows latest AI signals) */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Stock Analysis</h2>
          <LatestSignals />
        </section>

        {/* Market Overview computed from latest CSV */}
        <MarketOverview />
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default Dashboard;