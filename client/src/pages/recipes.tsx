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
  ChefHat, 
  Search,
  Scale,
  Calculator,
  DollarSign,
  Clock
} from "lucide-react";
import { AddRecipeDialog } from "@/components/recipes/add-recipe-dialog";
import { EditRecipeDialog } from "@/components/recipes/edit-recipe-dialog";
import { RecipesTable } from "@/components/recipes/recipes-table";
import { RecipeDetailsDialog } from "@/components/recipes/recipe-details-dialog";

export default function Recipes() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  // Get user restaurant data
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !isAuthLoading,
  });

  const restaurantId = userData?.restaurants?.[0]?.id;

  // Fetch recipes with error handling
  const { data: recipes = [], isLoading: isRecipesLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'recipes'],
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
        description: "Failed to load recipes",
        variant: "destructive",
      });
    },
  });

  // Fetch raw materials for recipe ingredients
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
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Restaurant Found</h3>
          <p className="text-gray-600 mb-6">You need to be associated with a restaurant to manage recipes.</p>
          <Button onClick={() => window.location.href = "/"}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Filter recipes based on search
  const filteredRecipes = recipes.filter((recipe: any) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate recipe statistics
  const totalRecipes = recipes.length;
  const averagePrep = recipes.length > 0 
    ? Math.round(recipes.reduce((sum: number, r: any) => sum + (r.prepTime || 0), 0) / recipes.length)
    : 0;
  const averageCost = recipes.length > 0
    ? recipes.reduce((sum: number, r: any) => sum + (r.costPerServing || 0), 0) / recipes.length
    : 0;
  const activeRecipes = recipes.filter((r: any) => r.isActive !== false).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat className="h-8 w-8 text-orange-600" />
              Recipes & Menu Items
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your restaurant's recipes and track ingredient costs
            </p>
          </div>
          <AddRecipeDialog restaurantId={restaurantId} rawMaterials={rawMaterials} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
              <ChefHat className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecipes}</div>
              <p className="text-xs text-gray-600">
                {activeRecipes} active recipes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Prep Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePrep}m</div>
              <p className="text-xs text-gray-600">
                preparation time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averageCost.toFixed(2)}</div>
              <p className="text-xs text-gray-600">
                per serving
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Raw Materials</CardTitle>
              <Scale className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rawMaterials.length}</div>
              <p className="text-xs text-gray-600">
                available ingredients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search recipes by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Recipes Content */}
        <Tabs defaultValue="recipes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recipes">All Recipes</TabsTrigger>
            <TabsTrigger value="cost-analysis">Cost Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="space-y-4">
            <RecipesTable 
              recipes={filteredRecipes} 
              isLoading={isRecipesLoading}
              onViewRecipe={setSelectedRecipe}
              onEditRecipe={setEditingRecipe}
            />
          </TabsContent>

          <TabsContent value="cost-analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recipe Cost Analysis</CardTitle>
                <CardDescription>
                  Analyze ingredient costs and profit margins for your recipes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Cost analysis feature coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recipe Details Dialog */}
        {selectedRecipe && (
          <RecipeDetailsDialog
            recipe={selectedRecipe}
            isOpen={!!selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            rawMaterials={rawMaterials}
          />
        )}

        {/* Edit Recipe Dialog */}
        {editingRecipe && restaurantId && (
          <EditRecipeDialog
            recipe={editingRecipe}
            isOpen={!!editingRecipe}
            setIsOpen={(open) => !open && setEditingRecipe(null)}
            restaurantId={restaurantId}
            rawMaterials={rawMaterials}
          />
        )}
      </div>
    </div>
  );
}