 
 
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/contexts/OrderContext";
import { useToast } from "@/hooks/use-toast";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { orders } = useOrders();
  const { toast } = useToast();

  const formatCurrency = (symbol: string, price: any) => {
    const isIN = /\.(NS|BO)$/i.test(symbol || '');
    const n = typeof price === 'number' ? price : parseFloat(price ?? '');
    return Number.isFinite(n) ? `${isIN ? '₹' : '$'}${n.toFixed(2)}` : '-';
  };


  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out" });
    onClose();
    navigate("/login");
  };

  // Watchlist feature removed

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Profile
          </DialogTitle>
          <DialogDescription>
            Manage your account and view your trading activity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Information removed */}

          {/* Watchlist section removed */}

          {/* Recent Orders */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Recent Orders
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {orders && orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders placed yet</p>
                  <p className="text-sm">Your trading activity will appear here</p>
                </div>
              ) : (
                <>
                  {orders && orders.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{order.symbol}</h4>
                          <p className="text-sm text-muted-foreground">{order.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.timestamp).toLocaleDateString()} {new Date(order.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={order.type === 'BUY' ? 'default' : 'destructive'}
                            className="mb-1"
                          >
                            {order.type === 'BUY' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {order.type}
                          </Badge>
                          <p className="text-sm font-semibold">{order.quantity} shares</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(order.symbol, order.price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;