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

  // Use the new universal webhook endpoint that handles all merchants
  const webhookUrl = `${window.location.origin}/api/webhook/clover`;

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
          {/* Webhook Setup Instructions */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Webhook className="h-5 w-5" />
                <CardTitle>Clover Webhook Setup</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the webhook URL below</li>
                  <li>Go to <a href="https://sandbox.dev.clover.com/developer-home/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Clover Developer Dashboard</a></li>
                  <li>Navigate to Your Apps → [Your App] → App Settings → Webhooks</li>
                  <li>Paste the webhook URL and click "Send Verification Code"</li>
                  <li>Copy the verification code from your server logs</li>
                  <li>Paste it back in Clover and click "Verify"</li>
                  <li>Subscribe to the events you need (Orders, Inventory, Payments)</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="webhook-url">Webhook URL (OAuth Secured)</Label>
                <div className="flex mt-1">
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 font-mono text-sm"
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
                  HTTPS-only endpoint that handles verification codes and webhook events
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
                <Label htmlFor="webhook-events">Event Format</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                  <pre className="text-sm font-mono text-slate-700">
{`{
  "appId": "2J5KGC1P86S96",
  "merchants": {
    "${restaurant?.cloverMerchantId || 'YOUR_MERCHANT_ID'}": [
      {
        "objectId": "O:ORDER_ID",
        "type": "CREATE",
        "ts": 1744632868847
      }
    ]
  }
}`}
                  </pre>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Expected webhook payload format from Clover POS
                </p>
              </div>

              <div>
                <Label htmlFor="auth-header">Security Headers</Label>
                <div className="space-y-2">
                  <div className="flex">
                    <Input
                      value="X-Clover-Auth: [auth_code_from_dashboard]"
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => copyToClipboard("X-Clover-Auth")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex">
                    <Input
                      value="Clover-Signature: t=timestamp,v1=signature"
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => copyToClipboard("Clover-Signature")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Clover sends these headers for webhook authentication and signature verification
                </p>
              </div>

              {/* Required Events and Permissions */}
              <div>
                <Label>Required Webhook Events</Label>
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">Orders Events:</div>
                      <div className="text-slate-600">• Orders (O) - CREATE, UPDATE, DELETE</div>
                      <div className="text-slate-500">Requires: Read Orders permission</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Inventory Events:</div>
                      <div className="text-slate-600">• Inventory (I) - CREATE, UPDATE, DELETE</div>
                      <div className="text-slate-500">Requires: Read Inventory permission</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Payment Events:</div>
                      <div className="text-slate-600">• Payments (P) - CREATE, UPDATE</div>
                      <div className="text-slate-500">Requires: Read Payments permission</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">Customer Events:</div>
                      <div className="text-slate-600">• Customers (C) - CREATE, UPDATE, DELETE</div>
                      <div className="text-slate-500">Requires: Read Customers permission</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4 border-t">
                <Badge className="bg-success-50 text-success-600">
                  Status: Ready
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Test the webhook with a sample payload
                    fetch('/api/webhook/clover/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        appId: "2J5KGC1P86S96",
                        merchants: {
                          [restaurant?.cloverMerchantId || 'test']: [{
                            objectId: "O:TEST123",
                            type: "CREATE",
                            ts: Date.now()
                          }]
                        }
                      })
                    }).then(() => {
                      toast({
                        title: "Test Sent",
                        description: "Check server logs for webhook processing",
                      });
                    });
                  }}
                >
                  Test Webhook
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://sandbox.dev.clover.com/developer-home/create-app', '_blank')}
                >
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
                    <div>
                      <span className="font-medium">ORDERS_CREATE</span>
                      <p className="text-xs text-slate-500">Auto deducts raw materials</p>
                    </div>
                    <Badge className="bg-success-50 text-success-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium">ORDERS_UPDATE</span>
                      <p className="text-xs text-slate-500">Order status changes</p>
                    </div>
                    <Badge className="bg-success-50 text-success-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium">PAYMENTS_CREATE</span>
                      <p className="text-xs text-slate-500">Payment processing</p>
                    </div>
                    <Badge className="bg-success-50 text-success-600">Active</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium">INVENTORY_UPDATE</span>
                      <p className="text-xs text-slate-500">Sync menu changes</p>
                    </div>
                    <Badge className="bg-success-50 text-success-600">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium">CUSTOMERS_*</span>
                      <p className="text-xs text-slate-500">Customer data events</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600">Logged</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium">All Object Types</span>
                      <p className="text-xs text-slate-500">Complete event coverage</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-600">Supported</Badge>
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
                    <h4 className="font-medium">Add Webhook Configuration</h4>
                    <p className="text-sm text-slate-600">
                      Enter the webhook URL above and set HTTP method to POST
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
                      Enable: ORDERS (Create/Update), PAYMENTS (Create), INVENTORY (Update)
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Verify Setup</h4>
                    <p className="text-sm text-slate-600">
                      Process a test order in Clover POS and check raw materials are automatically deducted
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
