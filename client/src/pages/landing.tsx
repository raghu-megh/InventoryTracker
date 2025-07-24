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
  Globe,
  Bell,
  Mail,
  MessageSquare,
  AlertTriangle
} from "lucide-react";
import { AppIconLarge } from "@/components/ui/app-icon";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Landing() {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleCloverSignIn = async () => {
    try {
      setIsSigningIn(true);
      console.log('Starting Clover sign in...');
      // Redirect to Clover OAuth endpoint
      window.location.href = '/api/auth/clover';
    } catch (error: any) {
      console.error('Clover sign in error:', error);
      let errorMessage = "Failed to sign in with Clover. Please try again.";
      
      if (error.message) {
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

  // Removed Apple sign-in - using Clover OAuth only

  const features = [
    {
      icon: <Package className="h-8 w-8 text-blue-600" />,
      title: "Recipe-Based Tracking",
      description: "Create recipes for menu items and automatically deduct raw materials when dishes are sold. Perfect ingredient cost control."
    },
    {
      icon: <Webhook className="h-8 w-8 text-green-600" />,
      title: "AI Receipt Scanning",
      description: "Upload receipt photos and AI extracts items, prices, and quantities automatically. No more manual data entry."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Clover POS Integration",
      description: "Seamless real-time sync with Clover POS. Sales automatically trigger recipe-based raw material deductions."
    },
    {
      icon: <Bell className="h-8 w-8 text-orange-600" />,
      title: "Smart Alert System",
      description: "Instant alerts for critical low stock via email and SMS, plus daily summaries for better inventory planning."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-red-600" />,
      title: "Premium Analytics",
      description: "Advanced business intelligence with profitability analysis, demand forecasting, and AI-powered cost optimization."
    },
    {
      icon: <Shield className="h-8 w-8 text-yellow-600" />,
      title: "Multi-Location Management",
      description: "Manage inventory across multiple restaurant locations with role-based access and centralized control."
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
              The only restaurant inventory system with recipe-based tracking and AI-powered receipt scanning. 
              Automatically deduct raw materials when items sell and import purchases with just a photo.
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
                onClick={handleCloverSignIn}
                disabled={isSigningIn}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              >
                <Shield className="h-5 w-5 mr-2" />
                {isSigningIn ? "Connecting..." : "Connect with Clover POS"}
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
                    Perfect Recipe Cost Control
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Link menu items to recipes and automatically deduct exact raw material amounts when dishes sell. Track true food costs per item.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    AI-Powered Purchase Entry
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Snap photos of receipts and AI automatically extracts items, quantities, and prices. No more manual data entry.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Real-Time POS Integration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Every sale automatically triggers recipe-based ingredient deductions through secure Clover POS webhooks.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Smart Alert System
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instant email and SMS alerts for critical low stock items, plus daily summaries for better planning and waste prevention.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-8 shadow-lg">
              <div className="text-center">
                <TrendingUp className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Complete Business Intelligence
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Track recipe costs, predict demand, optimize suppliers, and get AI-powered recommendations to increase profitability.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Bell className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 dark:text-gray-300">Smart Alerts</div>
                  </div>
                  <div>
                    <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 dark:text-gray-300">Analytics</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Available on all devices
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Analytics Section */}
      <div className="py-16 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Premium Business Intelligence
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Advanced analytics and AI-powered insights to maximize your restaurant's profitability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <CardTitle className="text-xl">Profitability Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-100 text-center">
                  Track true food costs, profit margins, and recipe performance with real-time cost variance analysis.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader className="text-center">
                <BarChart3 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <CardTitle className="text-xl">Demand Forecasting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-100 text-center">
                  AI predicts future demand patterns and recommends optimal order quantities to prevent stockouts.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader className="text-center">
                <Package className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <CardTitle className="text-xl">Cost Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-100 text-center">
                  Automated recommendations for waste reduction, supplier optimization, and menu engineering.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
              Available with Premium Subscription
            </Badge>
          </div>
        </div>
      </div>

      {/* Alert System Showcase */}
      <div className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Never Run Out of Ingredients Again
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Our intelligent alert system monitors your inventory 24/7 and notifies you the moment critical items drop below threshold levels.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Bell className="h-6 w-6 text-red-500" />
                  <span className="text-gray-700 dark:text-gray-300">Instant alerts for critical low stock</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-6 w-6 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">Email notifications with detailed reports</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">SMS alerts for immediate action</span>
                </div>
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">Daily summaries for inventory planning</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 rounded-lg p-8 shadow-lg">
              <div className="text-center">
                <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Prevent Stockouts & Overstock
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Smart alerts help you maintain optimal inventory levels, reducing waste and ensuring you never disappoint customers.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">25%</div>
                    <div className="text-gray-500">Less Food Waste</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">15%</div>
                    <div className="text-gray-500">Cost Reduction</div>
                  </div>
                </div>
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
              onClick={handleCloverSignIn}
              disabled={isSigningIn}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              Get Started with Clover
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-6 text-sm">
              <a href="/support" className="text-gray-400 hover:text-white transition-colors">
                Support
              </a>
              <a href="/eula" className="text-gray-400 hover:text-white transition-colors">
                End User License Agreement
              </a>
              <a href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
            <p className="text-gray-400 text-center">
              © 2025 MyRestaurantInventory. Streamlining restaurant operations worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}