import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Search,
  Scale,
  ChefHat
} from "lucide-react";
import { AddRawMaterialDialog } from "@/components/raw-materials/add-raw-material-dialog";
import { AddRawMaterialCategoryDialog } from "@/components/raw-materials/add-category-dialog";
import { RawMaterialsTable } from "@/components/raw-materials/raw-materials-table";
import { LowStockRawMaterialsAlert } from "@/components/raw-materials/low-stock-alerts";

export default function RawMaterials() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Get user restaurant data
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !isAuthLoading,
  });

  const restaurantId = userData?.restaurants?.[0]?.restaurant?.id;

  // Fetch raw materials with error handling
  const { data: rawMaterials = [], isLoading: isMaterialsLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'raw-materials'],
    enabled: !!restaurantId,
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
        description: "Failed to load raw materials",
        variant: "destructive",
      });
    },
  });

  // Fetch raw material categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'raw-material-categories'],
    enabled: !!restaurantId,
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

  // Fetch low stock raw materials
  const { data: lowStockMaterials = [], isLoading: isLowStockLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'raw-materials', 'low-stock'],
    enabled: !!restaurantId,
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

  // Loading states
  if (isAuthLoading || isUserLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If no restaurant, show message
  if (!restaurantId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Restaurant Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please add a restaurant first to manage raw materials.
          </p>
        </div>
      </div>
    );
  }

  // Filter materials based on search
  const filteredMaterials = rawMaterials.filter((material: any) =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.category?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate metrics
  const totalMaterials = rawMaterials.length;
  const lowStockCount = lowStockMaterials.length;
  const totalValue = rawMaterials.reduce((sum: number, material: any) => 
    sum + (Number(material.currentStock) * Number(material.costPerUnit || 0)), 0
  );
  const totalCategories = categories.length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Raw Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track ingredients and raw materials with automatic metric conversion
          </p>
        </div>
        <div className="flex gap-2">
          <AddRawMaterialCategoryDialog restaurantId={restaurantId} />
          <AddRawMaterialDialog 
            restaurantId={restaurantId} 
            categories={categories}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterials}</div>
            <p className="text-xs text-muted-foreground">
              Raw ingredients tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Need reordering
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
              Inventory worth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Material types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Scale className="h-3 w-3" />
          Metric System
        </Badge>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="materials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          <RawMaterialsTable 
            materials={filteredMaterials}
            isLoading={isMaterialsLoading}
            restaurantId={restaurantId}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isCategoriesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
              ))
            ) : categories.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No categories yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create categories to organize your raw materials
                </p>
                <AddRawMaterialCategoryDialog restaurantId={restaurantId} />
              </div>
            ) : (
              categories.map((category: any) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {rawMaterials.filter((m: any) => m.categoryId === category.id).length} materials
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <LowStockRawMaterialsAlert 
            materials={lowStockMaterials}
            isLoading={isLowStockLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}