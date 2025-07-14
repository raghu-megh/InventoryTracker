import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, ChefHat, DollarSign, Package } from "lucide-react";
import type { MenuItem } from "@shared/schema";

export default function MenuItemsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Set default restaurant when user data loads
  useEffect(() => {
    if (user?.restaurants?.length && !selectedRestaurant) {
      // Sort restaurants by creation date (assuming first added has earliest date)
      // If no creation date, use the first one in the array
      const sortedRestaurants = [...user.restaurants].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return 0;
      });
      setSelectedRestaurant(sortedRestaurants[0].id);
    }
  }, [user, selectedRestaurant]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  const { data: menuItems = [], isLoading, error } = useQuery<MenuItem[]>({
    queryKey: ['/api/restaurants', selectedRestaurant, 'menu-items'],
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
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncLoading(true);
      const response = await apiRequest(`/api/restaurants/${selectedRestaurant}/sync-clover-menu`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Menu items synced successfully from Clover POS",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', selectedRestaurant, 'menu-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync menu items",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSyncLoading(false);
    },
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading CloverSync...</div>
        </div>
      </div>
    );
  }

  if (!selectedRestaurant) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          user={user} 
          selectedRestaurant={selectedRestaurant} 
          onRestaurantChange={setSelectedRestaurant} 
        />
        <div className="flex-1 ml-64">
          <Header user={user} />
          <main className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">No Restaurant Selected</h2>
              <p className="text-gray-600 mt-2">Please select a restaurant to view menu items.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={user} 
        selectedRestaurant={selectedRestaurant} 
        onRestaurantChange={setSelectedRestaurant} 
      />
      <div className="flex-1 ml-64">
        <Header user={user} />
        <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu Items</h1>
          <p className="text-gray-600">Items synced from your Clover POS system</p>
        </div>
        <Button 
          onClick={() => syncMutation.mutate()}
          disabled={syncLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
          Sync from Clover
        </Button>
      </div>

      {menuItems.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Menu Items Found</h3>
              <p className="text-gray-600 mb-4">
                No menu items have been synced from your Clover POS yet. Click "Sync from Clover" to import your menu items.
              </p>
              <Button 
                onClick={() => syncMutation.mutate()}
                disabled={syncLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
                Sync from Clover
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{category}</h2>
                <Badge variant="secondary">{items.length} items</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          {item.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.price && (
                            <Badge variant="outline" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatPrice(item.price)}
                            </Badge>
                          )}
                          {item.hasRecipe && (
                            <Badge variant="default" className="gap-1">
                              <ChefHat className="h-3 w-3" />
                              Recipe
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {item.description && (
                      <CardContent className="pt-0">
                        <CardDescription>{item.description}</CardDescription>
                      </CardContent>
                    )}
                    
                    <Separator />
                    
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Clover ID: {item.cloverItemId}</span>
                        </div>
                        
                        {!item.hasRecipe ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              // Navigate to create recipe for this menu item, include restaurant ID
                              setLocation(`/recipes?menuItemId=${item.id}&restaurantId=${selectedRestaurant}`);
                            }}
                          >
                            <ChefHat className="h-3 w-3" />
                            Create Recipe
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() => {
                              // Navigate to view/edit recipe
                              setLocation('/recipes');
                            }}
                          >
                            <ChefHat className="h-3 w-3" />
                            View Recipe
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </main>
      </div>
    </div>
  );
}