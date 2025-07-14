import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import InventoryTable from "@/components/inventory/inventory-table";
import AddItemDialog from "@/components/inventory/add-item-dialog";
import AddCategoryDialog from "@/components/inventory/add-category-dialog";
import CategoriesList from "@/components/inventory/categories-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";

export default function Inventory() {
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

  // Fetch inventory data
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "inventory"],
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
        description: "Failed to load inventory",
        variant: "destructive",
      });
    },
  });

  // Get low stock items
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['/api/restaurants', selectedRestaurant, 'inventory', 'low-stock'],
    enabled: !!selectedRestaurant,
  });

  // Get categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/restaurants', selectedRestaurant, 'categories'],
    enabled: !!selectedRestaurant,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!user?.restaurants?.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Restaurants Found</h2>
          <p className="text-gray-600 dark:text-gray-300">Please create a restaurant first to manage inventory.</p>
        </div>
      </div>
    );
  }

  const totalValue = inventory.reduce((sum: number, item: any) => 
    sum + (parseFloat(item.currentStock) * parseFloat(item.costPerUnit || 0)), 0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar 
        user={user}
        selectedRestaurant={selectedRestaurant}
        onRestaurantChange={setSelectedRestaurant}
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title="Inventory Management"
          subtitle="Track and manage your restaurant inventory"
          webhookStatus="active"
          lastSync="2 minutes ago"
        />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Inventory Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventory.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {categories.length} categories
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Current inventory value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{categories.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Organization groups
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="items" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="low-stock">
                    Low Stock
                    {lowStockItems.length > 0 && (
                      <Badge variant="destructive" className="ml-2">{lowStockItems.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <AddCategoryDialog restaurantId={selectedRestaurant} />
                  <AddItemDialog restaurantId={selectedRestaurant} />
                </div>
              </div>

              <TabsContent value="items" className="space-y-4">
                <InventoryTable 
                  items={inventory}
                  selectedRestaurant={selectedRestaurant}
                  isLoading={inventoryLoading}
                  showActions={true}
                />
              </TabsContent>

              <TabsContent value="categories" className="space-y-4">
                <CategoriesList restaurantId={selectedRestaurant} />
              </TabsContent>

              <TabsContent value="low-stock" className="space-y-4">
                {lowStockItems.length > 0 ? (
                  <InventoryTable 
                    items={lowStockItems}
                    selectedRestaurant={selectedRestaurant}
                    isLoading={false}
                    showActions={true}
                  />
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertTriangle className="h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        All Stock Levels Good
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-center">
                        No items are currently below their minimum stock level.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
