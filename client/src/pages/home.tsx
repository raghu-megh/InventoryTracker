import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  Plus,
  Building,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  LogOut,
  Scale,
  ChefHat,
  CreditCard,
  Menu
} from "lucide-react";
import { AppIcon } from "@/components/ui/app-icon";
import { signOutUser } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    location: '',
    cloverMerchantId: ''
  });
  const queryClient = useQueryClient();

  // Get user data with restaurants
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  const addRestaurantMutation = useMutation({
    mutationFn: (data: typeof restaurantForm) => apiRequest('POST', '/api/restaurants', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant added successfully!",
      });
      setIsAddingRestaurant(false);
      setRestaurantForm({ name: '', location: '', cloverMerchantId: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add restaurant",
        variant: "destructive",
      });
    },
  });

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutUser();
      toast({
        title: "Success",
        description: "Successfully signed out!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const quickActions = [
    {
      title: "Dashboard",
      description: "View restaurant metrics and analytics",
      icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
      href: "/dashboard",
      badge: "Active"
    },
    {
      title: "Menu Items",
      description: "Import items from Clover POS",
      icon: <Menu className="h-8 w-8 text-emerald-600" />,
      href: "/menu-items",
      badge: "Clover"
    },
    {
      title: "Recipes",
      description: "Manage menu items and recipe costs",
      icon: <ChefHat className="h-8 w-8 text-orange-600" />,
      href: "/recipes",
      badge: "Menu"
    },
    {
      title: "Raw Materials",
      description: "Track recipe ingredients with metric conversion",
      icon: <Scale className="h-8 w-8 text-indigo-600" />,
      href: "/raw-materials",
      badge: "Metric"
    },
    {
      title: "Purchasing",
      description: "Record purchases with AI receipt scanning",
      icon: <CreditCard className="h-8 w-8 text-cyan-600" />,
      href: "/purchasing",
      badge: "AI Powered"
    },
    {
      title: "Inventory",
      description: "Manage stock levels and categories",
      icon: <Package className="h-8 w-8 text-green-600" />,
      href: "/inventory",
      badge: "Updated"
    },
    {
      title: "Team Members",
      description: "Manage restaurant staff and permissions",
      icon: <Users className="h-8 w-8 text-purple-600" />,
      href: "/users",
      badge: "5 Users"
    },
    {
      title: "Advanced Settings",
      description: "Configure integrations and webhooks",
      icon: <Settings className="h-8 w-8 text-gray-600" />,
      href: "/settings",
      badge: "Connected"
    }
  ];

  const handleAddRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantForm.name.trim()) {
      toast({
        title: "Error",
        description: "Restaurant name is required",
        variant: "destructive",
      });
      return;
    }
    if (!restaurantForm.cloverMerchantId.trim()) {
      toast({
        title: "Error",
        description: "Clover Merchant ID is required",
        variant: "destructive",
      });
      return;
    }
    addRestaurantMutation.mutate(restaurantForm);
  };

  const stats = [
    {
      title: "Total Restaurants",
      value: user?.restaurants?.length?.toString() || "0",
      change: user?.restaurants?.length ? `${user.restaurants.length} active` : "No restaurants yet",
      icon: <Building className="h-5 w-5 text-blue-600" />,
      trend: "up"
    },
    {
      title: "Active Inventory Items",
      value: "247",
      change: "+12 this week",
      icon: <Package className="h-5 w-5 text-green-600" />,
      trend: "up"
    },
    {
      title: "Low Stock Alerts",
      value: "8",
      change: "-3 since yesterday",
      icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
      trend: "down"
    },
    {
      title: "System Status",
      value: "Healthy",
      change: "All systems operational",
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      trend: "stable"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <AppIcon size={32} className="shrink-0" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MyRestaurantInventory</h1>
            </div>
            <Button 
              onClick={handleSignOut}
              disabled={isSigningOut}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your restaurant inventory with real-time Clover POS integration.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  {stat.trend === "up" && <TrendingUp className="h-3 w-3 mr-1 text-green-600" />}
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white dark:bg-gray-800">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-full w-fit">
                      {action.icon}
                    </div>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        {action.title}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {action.badge}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 dark:text-gray-300 text-center">
                      {action.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Get Started
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Set up your first restaurant location and start tracking inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Dialog open={isAddingRestaurant} onOpenChange={setIsAddingRestaurant}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Restaurant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Restaurant</DialogTitle>
                    <DialogDescription>
                      Create a new restaurant location to manage inventory and integrate with Clover POS.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddRestaurant}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Restaurant Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="e.g., Downtown Bistro"
                          value={restaurantForm.name}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Address</Label>
                        <Input
                          id="location"
                          type="text"
                          placeholder="e.g., 123 Main St, City, State"
                          value={restaurantForm.location}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, location: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cloverMerchantId">Clover Merchant ID *</Label>
                        <Input
                          id="cloverMerchantId"
                          type="text"
                          placeholder="e.g., M1A2B3C4D5E6"
                          value={restaurantForm.cloverMerchantId}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, cloverMerchantId: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddingRestaurant(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addRestaurantMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {addRestaurantMutation.isPending ? "Adding..." : "Add Restaurant"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                View Integration Guide
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex space-x-6 text-sm">
              <a href="/support" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                Support
              </a>
              <a href="/eula" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                End User License Agreement
              </a>
              <a href="/privacy-policy" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                Privacy Policy
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 MyRestaurantInventory. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}