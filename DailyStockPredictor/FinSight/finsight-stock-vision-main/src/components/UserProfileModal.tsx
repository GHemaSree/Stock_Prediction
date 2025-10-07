import { useEffect } from "react";
import { useState } from "react";
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
  const { user, signOut, token } = useAuth();
  const { orders } = useOrders();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoadingProfile(true);
  fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => toast({
        title: "Error loading profile",
        description: "Could not fetch user info.",
        variant: "destructive",
      }))
      .finally(() => setLoadingProfile(false));
  }, [isOpen, token, toast]);

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out" });
    onClose();
    navigate("/login");
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/watchlist/${symbol}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setProfile((prev: any) => ({
          ...prev,
          watchlist: prev.watchlist.filter((s: string) => s !== symbol),
        }));
        toast({
          title: "Removed from watchlist",
          description: `${symbol} removed successfully`,
          variant: "default",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not remove from watchlist",
        variant: "destructive",
      });
    }
  };

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
          {/* User Info */}
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

          <Separator />

          {/* Watchlist */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Watchlist</h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              {profile?.watchlist?.length ? (
                profile.watchlist.map((symbol: string) => (
                  <div key={symbol} className="flex items-center justify-between mb-2">
                    <span>{symbol}</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveFromWatchlist(symbol)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No stocks in watchlist.</p>
              )}
            </div>
          </div>

          <Separator />

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
                          <p className="text-sm text-muted-foreground">{order.price}</p>
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