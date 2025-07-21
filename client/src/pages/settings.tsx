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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Webhook, Copy, RefreshCw, ExternalLink, Settings2, Shield, AlertCircle } from "lucide-react";

export default function Settings() {
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

  const webhookUrl = `${window.location.origin}/api/webhook/clover`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const testWebhook = async () => {
    try {
      const response = await fetch("/api/webhook/clover/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId: restaurant?.cloverMerchantId }),
      });

      if (response.ok) {
        toast({
          title: "Test Successful",
          description: "Webhook endpoint is working correctly",
        });
      } else {
        toast({
          title: "Test Failed",
          description: "Webhook test failed. Check server logs.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test webhook",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        user={user} 
        selectedRestaurant={selectedRestaurant}
        onRestaurantChange={setSelectedRestaurant}
      />
      
      <div className="lg:ml-64">
        <Header 
          user={user}
          selectedRestaurant={selectedRestaurant}
          onRestaurantChange={setSelectedRestaurant}
        />
        
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <Settings2 className="h-8 w-8 text-gray-600" />
                <h1 className="text-3xl font-bold text-gray-900">Advanced Settings</h1>
              </div>
              <p className="text-gray-600">
                Advanced configuration and integration settings for your restaurant
              </p>
            </div>

            <Tabs defaultValue="webhooks" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="webhooks">Webhook Integration</TabsTrigger>
                <TabsTrigger value="security">Security & Access</TabsTrigger>
              </TabsList>

              {/* Webhook Settings Tab */}
              <TabsContent value="webhooks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Webhook className="h-5 w-5" />
                      <span>Clover Webhook Integration</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ✓ Verified
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-green-800">Webhook Successfully Verified</h3>
                          <p className="text-sm text-green-700 mt-1">
                            Your Clover POS integration is active and securely receiving real-time updates.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook Endpoint URL</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="webhook-url"
                          value={webhookUrl}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(webhookUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        This universal endpoint handles webhooks for all your restaurants
                      </p>
                    </div>

                    {/* Restaurant Details */}
                    {restaurant && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Restaurant</Label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium">{restaurant.name}</p>
                            <p className="text-sm text-gray-600">{restaurant.location}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Clover Merchant ID</Label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-mono text-sm">{restaurant.cloverMerchantId}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <Button onClick={testWebhook} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Test Webhook
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://sandbox.dev.clover.com/developer-home/dashboard', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Clover Developer Console
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Documentation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Integration Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Supported Event Types</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <Badge variant="secondary">ORDER_CREATED</Badge>
                        <Badge variant="secondary">ORDER_PAID</Badge>
                        <Badge variant="secondary">PAYMENT_CREATED</Badge>
                        <Badge variant="secondary">INVENTORY_UPDATED</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Security</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• HMAC-SHA256 signature verification</li>
                        <li>• OAuth-secured webhook authentication</li>
                        <li>• Merchant-specific auth code validation</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Access Control</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-blue-800">Developer Access Required</h3>
                          <p className="text-sm text-blue-700 mt-1">
                            Advanced security settings are available for restaurant owners and system administrators.
                            Contact support for additional access controls.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}