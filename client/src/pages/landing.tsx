import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Smartphone, 
  Tablet, 
  Monitor, 
  BarChart3, 
  Package, 
  Webhook, 
  Users, 
  TrendingUp, 
  Shield,
  Zap,
  Globe
} from "lucide-react";
import { AppIconLarge } from "@/components/ui/app-icon";
import { signInWithGoogle, signInWithApple } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Landing() {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      console.log('Starting Google sign in...');
      const result = await signInWithGoogle();
      console.log('Google sign in successful:', result);
      toast({
        title: "Success",
        description: "Successfully signed in with Google!",
      });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      let errorMessage = "Failed to sign in with Google. Please try again.";
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized. Please configure your Firebase project.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in was cancelled.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked. Please allow popups and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithApple();
      toast({
        title: "Success",
        description: "Successfully signed in with Apple!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign in with Apple. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const features = [
    {
      icon: <Package className="h-8 w-8 text-blue-600" />,
      title: "Real-time Inventory Tracking",
      description: "Monitor stock levels across all restaurant locations with automatic low-stock alerts and comprehensive reporting."
    },
    {
      icon: <Webhook className="h-8 w-8 text-green-600" />,
      title: "Clover POS Integration",
      description: "Seamless synchronization with Clover POS systems for automatic inventory updates from sales and orders."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Advanced Analytics",
      description: "Gain insights into sales trends, inventory turnover, and performance metrics with intuitive dashboards."
    },
    {
      icon: <Users className="h-8 w-8 text-orange-600" />,
      title: "Multi-tenant Support",
      description: "Manage multiple restaurant locations with role-based access control and centralized administration."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Secure Authentication",
      description: "Enterprise-grade security with Google and Apple OAuth integration for safe and convenient access."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Lightning Fast",
      description: "Built with modern technologies for optimal performance across all devices and screen sizes."
    }
  ];

  const devices = [
    { icon: <Smartphone className="h-6 w-6" />, label: "Mobile" },
    { icon: <Tablet className="h-6 w-6" />, label: "Tablet" },
    { icon: <Monitor className="h-6 w-6" />, label: "Desktop" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            {/* App Icon */}
            <div className="flex justify-center mb-8">
              <AppIconLarge size={80} className="drop-shadow-lg" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              <span className="text-blue-600">MyRestaurantInventory</span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl font-normal text-gray-600 dark:text-gray-300">
                Restaurant Inventory Management
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Streamline your restaurant operations with real-time inventory tracking, 
              seamless Clover POS integration, and powerful analytics across all your locations.
            </p>
            
            {/* Device Compatibility */}
            <div className="flex justify-center items-center space-x-6 mb-8">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Works on all devices:</span>
              {devices.map((device, index) => (
                <div key={index} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  {device.icon}
                  <span className="text-sm">{device.label}</span>
                </div>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex justify-center">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                <Globe className="h-5 w-5 mr-2" />
                {isSigningIn ? "Signing in..." : "Sign in with Google"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for Modern Restaurants
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to manage inventory efficiently and grow your restaurant business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-full w-fit">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300 text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose MyRestaurantInventory?
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Reduce Food Waste by 40%
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Smart inventory tracking helps you optimize ordering and minimize waste with predictive analytics.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Save 10+ Hours Weekly
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Automated synchronization with Clover POS eliminates manual inventory counting and data entry.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Increase Profit Margins
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Better inventory control and cost tracking help you identify opportunities to improve profitability.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-8 shadow-lg">
              <div className="text-center">
                <TrendingUp className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Real-time Dashboard
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Monitor your restaurant's performance with live metrics, alerts, and comprehensive reporting.
                </p>
                <Badge variant="secondary" className="text-sm">
                  Available on all devices
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Transform Your Restaurant?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of restaurants already using MyRestaurantInventory to streamline their operations.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
            >
              Get Started with Google
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 MyRestaurantInventory. Streamlining restaurant operations worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}