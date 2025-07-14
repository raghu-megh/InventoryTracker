import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ChefHat, 
  Clock, 
  Users, 
  DollarSign,
  Scale,
  TrendingUp,
  List,
  X
} from "lucide-react";

interface RecipeDetailsDialogProps {
  recipe: any;
  isOpen: boolean;
  onClose: () => void;
  rawMaterials: any[];
}

export function RecipeDetailsDialog({ recipe, isOpen, onClose, rawMaterials }: RecipeDetailsDialogProps) {
  if (!recipe) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'appetizer': return 'bg-purple-100 text-purple-800';
      case 'main': return 'bg-blue-100 text-blue-800';
      case 'side': return 'bg-orange-100 text-orange-800';
      case 'dessert': return 'bg-pink-100 text-pink-800';
      case 'beverage': return 'bg-cyan-100 text-cyan-800';
      case 'sauce': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProfitMargin = (cost: number, price: number) => {
    if (!cost || !price) return null;
    return ((price - cost) / price * 100).toFixed(1);
  };

  const profitMargin = calculateProfitMargin(recipe.costPerServing, recipe.sellingPrice);
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  // Get ingredient details by matching with raw materials
  const getIngredientDetails = (ingredientId: string) => {
    return rawMaterials.find(material => material.id === ingredientId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ChefHat className="h-6 w-6 text-orange-600" />
                {recipe.name}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {recipe.description || "Recipe details and ingredients"}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-600">Servings</div>
                  <div className="font-semibold">{recipe.servings || 'N/A'}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-sm text-gray-600">Total Time</div>
                  <div className="font-semibold">
                    {totalTime > 0 ? `${totalTime}m` : 'N/A'}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-sm text-gray-600">Cost/Serving</div>
                  <div className="font-semibold">
                    {recipe.costPerServing ? `$${recipe.costPerServing.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-sm text-gray-600">Profit Margin</div>
                  <div className="font-semibold">
                    {profitMargin ? `${profitMargin}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recipe Metadata */}
          <div className="flex flex-wrap gap-4">
            {recipe.category && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Category:</span>
                <Badge className={getCategoryColor(recipe.category)}>
                  {recipe.category}
                </Badge>
              </div>
            )}
            
            {recipe.difficulty && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Difficulty:</span>
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {recipe.difficulty}
                </Badge>
              </div>
            )}

            {recipe.prepTime && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Prep:</span>
                <span className="text-sm font-medium">{recipe.prepTime}m</span>
              </div>
            )}

            {recipe.cookTime && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Cook:</span>
                <span className="text-sm font-medium">{recipe.cookTime}m</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing Information */}
          {(recipe.costPerServing || recipe.sellingPrice) && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    Pricing Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Cost per Serving</div>
                      <div className="text-2xl font-bold text-red-600">
                        {recipe.costPerServing ? `$${recipe.costPerServing.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Selling Price</div>
                      <div className="text-2xl font-bold text-green-600">
                        {recipe.sellingPrice ? `$${recipe.sellingPrice.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Profit Margin</div>
                      <div className={`text-2xl font-bold ${
                        profitMargin && parseFloat(profitMargin) > 50 ? 'text-green-600' : 
                        profitMargin && parseFloat(profitMargin) > 30 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {profitMargin ? `${profitMargin}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Separator />
            </>
          )}

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale className="h-5 w-5" />
                Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <div className="space-y-3">
                  {recipe.ingredients.map((ingredient: any, index: number) => {
                    const materialDetails = getIngredientDetails(ingredient.rawMaterialId);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">
                            {materialDetails?.name || `Material ID: ${ingredient.rawMaterialId}`}
                          </div>
                          {materialDetails?.description && (
                            <div className="text-sm text-gray-600">{materialDetails.description}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {ingredient.quantity} {ingredient.unit}
                          </div>
                          {materialDetails?.costPerUnit && (
                            <div className="text-sm text-gray-600">
                              ~${(materialDetails.costPerUnit * ingredient.quantity).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Scale className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No ingredients listed for this recipe</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          {recipe.instructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <List className="h-5 w-5" />
                  Cooking Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-gray-700">
                  {recipe.instructions}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}