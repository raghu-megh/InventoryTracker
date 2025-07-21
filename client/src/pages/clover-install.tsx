import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink, ArrowRight, Store, Zap, Shield } from "lucide-react";

export default function CloverInstall() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Capture URL parameters from Clover OAuth flow
    const params = new URLSearchParams(window.location.search);
    setUrlParams(params);
    
    // Log OAuth parameters for debugging
    const merchantId = params.get('merchant_id');
    const code = params.get('code');
    const state = params.get('state');
    
    console.log('Clover OAuth parameters:', { merchantId, code, state });
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && user?.restaurants?.length) {
      toast({
        title: "Welcome to MyInventory!",
        description: "Your Clover POS integration is ready to use.",
      });
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    }
  }, [isAuthenticated, user, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Setting up your MyInventory integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">MyInventory</h1>
                <p className="text-sm text-slate-500">Restaurant Inventory Management</p>
              </div>
            </div>
            {isAuthenticated ? (
              <Button onClick={() => setLocation('/')} className="bg-primary hover:bg-primary/90">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => window.location.href = '/api/login'} variant="outline">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-6 py-3 rounded-full border border-green-200 mb-4">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">MyInventory App Successfully Installed</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Welcome to Smart Inventory Management
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Your Clover POS is now connected to MyInventory. Automatically track inventory, 
            manage raw materials, and streamline your restaurant operations.
          </p>
        </div>

        {/* OAuth Debug Info for Development */}
        {urlParams && (urlParams.get('merchant_id') || urlParams.get('code')) && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Integration Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {urlParams.get('merchant_id') && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Merchant ID:</span>
                  <Badge className="bg-blue-100 text-blue-800">{urlParams.get('merchant_id')}</Badge>
                </div>
              )}
              {urlParams.get('code') && (
                <div className="flex justify-between">
                  <span className="text-blue-700">OAuth Code:</span>
                  <Badge className="bg-blue-100 text-blue-800 font-mono text-xs">
                    {urlParams.get('code')?.substring(0, 10)}...
                  </Badge>
                </div>
              )}
              {urlParams.get('state') && (
                <div className="flex justify-between">
                  <span className="text-blue-700">State:</span>
                  <Badge className="bg-blue-100 text-blue-800">{urlParams.get('state')}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Real-Time Sync</h3>
              <p className="text-slate-600 text-sm">
                Automatic inventory updates when orders are processed through your Clover POS
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Recipe Management</h3>
              <p className="text-slate-600 text-sm">
                Create recipes and automatically deduct raw materials based on menu item sales
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Secure Integration</h3>
              <p className="text-slate-600 text-sm">
                OAuth-secured webhook integration with enterprise-grade security standards
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <h4 className="font-medium text-slate-900">Sign In to MyInventory</h4>
                  <p className="text-slate-600 text-sm">Create your account or sign in to access the dashboard</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <h4 className="font-medium text-slate-900">Configure Your Restaurant</h4>
                  <p className="text-slate-600 text-sm">Set up your restaurant profile and connect your Clover merchant account</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <h4 className="font-medium text-slate-900">Import Menu Items</h4>
                  <p className="text-slate-600 text-sm">Sync your Clover menu items and start creating recipes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center mt-12">
          {isAuthenticated ? (
            <Button size="lg" onClick={() => setLocation('/')} className="bg-primary hover:bg-primary/90">
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <div className="space-y-4">
              <Button size="lg" onClick={() => window.location.href = '/api/login'} className="bg-primary hover:bg-primary/90">
                Get Started with MyInventory
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-slate-500">
                Already have an account? 
                <button 
                  onClick={() => window.location.href = '/api/login'} 
                  className="text-primary hover:underline ml-1"
                >
                  Sign in here
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Support */}
        <div className="text-center mt-8 pt-8 border-t border-slate-200">
          <p className="text-slate-500 text-sm mb-4">
            Need help getting started? 
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('mailto:support@myinventory.app', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </main>
    </div>
  );
}