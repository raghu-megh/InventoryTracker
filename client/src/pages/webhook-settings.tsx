import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Webhook, Copy, RefreshCw, ExternalLink } from "lucide-react";

export default function WebhookSettings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");

  // Set default restaurant when user data loads
  useEffect(() => {
    if (user?.restaurants?.length && !selectedRestaurant) {
      setSelectedRestaurant(user.restaurants[0].id);
    }
  }, [user, selectedRestaurant]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch restaurant details
  const { data: restaurant } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant],
    enabled: !!selectedRestaurant,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load restaurant details",
        variant: "destructive",
      });
    },
  });

  const webhookUrl = restaurant?.cloverMerchantId 
    ? `${window.location.origin}/api/webhook/clover/${restaurant.cloverMerchantId}`
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar 
        user={user} 
        selectedRestaurant={selectedRestaurant}
        onRestaurantChange={setSelectedRestaurant}
      />
      
      <main className="pl-64">
        <Header 
          title="Webhook Settings"
          subtitle="Configure Clover POS webhook integration"
        />
        
        <div className="p-6 space-y-6">
          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Webhook className="h-5 w-5" />
                <CardTitle>Webhook Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <div className="flex mt-1">
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Use this URL in your Clover dashboard webhook configuration
                </p>
              </div>

              <div>
                <Label htmlFor="clover-merchant-id">Clover Merchant ID</Label>
                <Input
                  id="clover-merchant-id"
                  value={restaurant?.cloverMerchantId || ''}
                  readOnly
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="webhook-secret">Webhook Secret</Label>
                <div className="flex mt-1">
                  <Input
                    id="webhook-secret"
                    type="password"
                    value={restaurant?.webhookSecret || ''}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Used to verify webhook signatures for security
                </p>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t">
                <Badge className="bg-success-50 text-success-600">
                  Status: Active
                </Badge>
                <Button variant="outline" size="sm">
                  Test Webhook
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Clover Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Supported Events */}
          <Card>
            <CardHeader>
              <CardTitle>Supported Webhook Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">PAYMENT_CREATED</span>
                    <Badge className="bg-success-50 text-success-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">ORDER_UPDATED</span>
                    <Badge className="bg-success-50 text-success-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">ORDER_CREATED</span>
                    <Badge className="bg-success-50 text-success-600">Enabled</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">INVENTORY_UPDATED</span>
                    <Badge className="bg-success-50 text-success-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">INVENTORY_CREATED</span>
                    <Badge className="bg-warning-50 text-warning-600">Optional</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">PAYMENT (Checkout)</span>
                    <Badge className="bg-success-50 text-success-600">Enabled</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Log into Clover Developer Dashboard</h4>
                    <p className="text-sm text-slate-600">
                      Navigate to Your Apps → [App Name] → App Settings → Webhooks
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Configure Callback URL</h4>
                    <p className="text-sm text-slate-600">
                      Enter the webhook URL above and verify it by copying the verification code from your logs
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Subscribe to Events</h4>
                    <p className="text-sm text-slate-600">
                      Select the event types listed above in the "Events Subscriptions" section
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Test Integration</h4>
                    <p className="text-sm text-slate-600">
                      Make a test sale in your Clover POS to verify the webhook is working
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
