import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const navigate = useNavigate();
  const { user, token, signOut } = useAuth();
  const { toast } = useToast();

  const formatCurrency = (symbol: string, price: any) => {
    const isIN = /\.(NS|BO)$/i.test(symbol || '');
    const n = typeof price === 'number' ? price : parseFloat(price ?? '');
    return Number.isFinite(n) ? `${isIN ? '₹' : '$'}${n.toFixed(2)}` : '-';
  };


  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Orders state (from backend)
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Load profile on open
  useEffect(() => {
    if (!isOpen || !token) return;
    setLoadingProfile(true);
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() =>
        toast({ title: "Error loading profile", description: "Could not fetch user info.", variant: "destructive" })
      )
      .finally(() => setLoadingProfile(false));
  }, [isOpen, token, toast]);

  // Load orders on open
  useEffect(() => {
    if (!isOpen || !user?.email) return;
    setLoadingOrders(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    fetch(`${base}/api/orders?userId=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data?.items) ? data.items : []))
      .catch(() =>
        toast({ title: "Error loading orders", description: "Could not fetch your orders.", variant: "destructive" })
      )
      .finally(() => setLoadingOrders(false));
  }, [isOpen, user?.email, toast]);

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
          {/* Account Information */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Account Information</h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              {loadingProfile ? (
                <p>Loading...</p>
              ) : profile ? (
                <>
                  <p className="font-medium text-lg">{profile.full_name}</p>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Date of Birth: {profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No user info available.</p>
              )}
            </div>
          </div>

          {/* Watchlist section removed */}

          {/* Recent Orders (from backend) */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Recent Orders
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {loadingOrders ? (
                <div className="text-muted-foreground">Loading orders…</div>
              ) : orders && orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders placed yet</p>
                  <p className="text-sm">Your trading activity will appear here</p>
                </div>
              ) : (
                <>
                  {orders && orders.slice(0, 10).map((order: any, idx: number) => (
                    <div key={order._id || idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{order.symbol}</h4>
                          <p className="text-sm text-muted-foreground">{order.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.timestamp ? new Date(order.timestamp).toLocaleDateString() : ''} {order.timestamp ? new Date(order.timestamp).toLocaleTimeString() : ''}
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
                          <p className="text-sm text-muted-foreground">{order.price ? order.price : formatCurrency(order.symbol, order.priceNum)}</p>
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