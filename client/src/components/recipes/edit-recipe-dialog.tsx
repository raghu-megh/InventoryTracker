import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChefHat, AlertCircle } from "lucide-react";

interface EditRecipeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  recipe: any;
  restaurantId: string;
  rawMaterials: any[];
}

interface RecipeIngredient {
  id?: string;
  rawMaterialId: string;
  quantity: string;
  unit: string;
}

export function EditRecipeDialog({ 
  isOpen, 
  setIsOpen, 
  recipe, 
  restaurantId, 
  rawMaterials 
}: EditRecipeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    servings: "1",
    prepTime: "",
    cookTime: "",
    difficulty: "",
    instructions: "",
    costPerServing: "",
    sellingPrice: "",
    isActive: true,
  });

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Fetch recipe ingredients
  const { data: recipeIngredients = [] } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'recipes', recipe?.id, 'ingredients'],
    enabled: !!recipe?.id && isOpen,
  });

  // Initialize form when recipe changes
  useEffect(() => {
    if (recipe && isOpen) {
      setForm({
        name: recipe.name || "",
        description: recipe.description || "",
        category: recipe.category || "",
        servings: recipe.servings?.toString() || "1",
        prepTime: recipe.prepTime?.toString() || "",
        cookTime: recipe.cookTime?.toString() || "",
        difficulty: recipe.difficulty || "",
        instructions: recipe.instructions || "",
        costPerServing: recipe.costPerServing?.toString() || "",
        sellingPrice: recipe.sellingPrice?.toString() || "",
        isActive: recipe.isActive !== false,
      });
    }
  }, [recipe, isOpen]);

  // Initialize ingredients when recipe ingredients load
  useEffect(() => {
    if (recipeIngredients.length > 0) {
      setIngredients(recipeIngredients.map((ing: any) => ({
        id: ing.id,
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity?.toString() || "0",
        unit: ing.unit || "g",
      })));
    }
  }, [recipeIngredients]);

  const availableUnits = [
    // Metric (preferred storage)
    { value: 'kg', label: 'Kilograms (kg)', category: 'metric-weight' },
    { value: 'g', label: 'Grams (g)', category: 'metric-weight' },
    { value: 'l', label: 'Liters (l)', category: 'metric-volume' },
    { value: 'ml', label: 'Milliliters (ml)', category: 'metric-volume' },
    
    // Imperial (will be converted)
    { value: 'lbs', label: 'Pounds (lbs)', category: 'imperial-weight' },
    { value: 'oz', label: 'Ounces (oz)', category: 'imperial-weight' },
    { value: 'cups', label: 'Cups', category: 'imperial-volume' },
    { value: 'tbsp', label: 'Tablespoons (tbsp)', category: 'imperial-volume' },
    { value: 'tsp', label: 'Teaspoons (tsp)', category: 'imperial-volume' },
    { value: 'gallon', label: 'Gallons', category: 'imperial-volume' },
    { value: 'quart', label: 'Quarts', category: 'imperial-volume' },
    { value: 'pint', label: 'Pints', category: 'imperial-volume' },
    { value: 'fl oz', label: 'Fluid Ounces (fl oz)', category: 'imperial-volume' },
    
    // Count
    { value: 'pieces', label: 'Pieces', category: 'count' },
  ];

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Updating recipe data:', data);
      try {
        const response = await apiRequest('PUT', `/api/restaurants/${restaurantId}/recipes/${recipe.id}`, data);
        console.log('Recipe update response:', response);
        return response;
      } catch (error) {
        console.error('Recipe update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recipe updated successfully",
      });
      setIsOpen(false);
      // Invalidate both restaurant recipes and specific menu-item recipe queries
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'recipes'] });
      if (recipe?.menuItemId) {
        queryClient.invalidateQueries({ queryKey: ['/api/menu-items', recipe.menuItemId, 'recipe'] });
      }
      // Also invalidate all menu-item recipe queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
    },
    onError: (error: Error) => {
      console.error('Recipe mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update recipe",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category: "",
      servings: "1",
      prepTime: "",
      cookTime: "",
      difficulty: "",
      instructions: "",
      costPerServing: "",
      sellingPrice: "",
      isActive: true,
    });
    setIngredients([]);
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, {
      rawMaterialId: "",
      quantity: "",
      unit: "g"
    }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: "Error",
        description: "Recipe name is required",
        variant: "destructive",
      });
      return;
    }

    if (ingredients.length === 0) {
      toast({
        title: "Error",
        description: "At least one ingredient is required",
        variant: "destructive",
      });
      return;
    }

    // Validate ingredients
    const invalidIngredients = ingredients.some(ing => 
      !ing.rawMaterialId || !ing.quantity || ing.quantity <= 0 || !ing.unit
    );

    if (invalidIngredients) {
      toast({
        title: "Error",
        description: "All ingredients must have material, positive quantity, and unit selected",
        variant: "destructive",
      });
      return;
    }

    console.log('Form validation passed. Ingredients:', ingredients);

    const submitData = {
      ...form,
      servings: form.servings ? parseInt(form.servings) : 1,
      prepTime: form.prepTime ? parseInt(form.prepTime) : null,
      cookTime: form.cookTime ? parseInt(form.cookTime) : null,
      costPerServing: form.costPerServing ? parseFloat(form.costPerServing) : null,
      sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
      ingredients: ingredients.map(ing => ({
        id: ing.id,
        rawMaterialId: ing.rawMaterialId,
        quantity: Number(ing.quantity),
        unit: ing.unit
      }))
    };

    mutation.mutate(submitData);
  };

  const isImperialUnit = (unit: string) => {
    const imperialUnits = ['lbs', 'oz', 'cups', 'tbsp', 'tsp', 'gallon', 'quart', 'pint', 'fl oz'];
    return imperialUnits.includes(unit);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Edit Recipe: {recipe?.name}
          </DialogTitle>
          <DialogDescription>
            Update recipe details and ingredients. Units will be converted to metric for consistency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Recipe Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter recipe name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Pizza, Pasta, Salad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={form.servings}
                onChange={(e) => setForm(prev => ({ ...prev, servings: e.target.value }))}
                placeholder="Number of servings"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(value) => setForm(prev => ({ ...prev, difficulty: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                id="prepTime"
                type="number"
                min="0"
                value={form.prepTime}
                onChange={(e) => setForm(prev => ({ ...prev, prepTime: e.target.value }))}
                placeholder="Preparation time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook Time (minutes)</Label>
              <Input
                id="cookTime"
                type="number"
                min="0"
                value={form.cookTime}
                onChange={(e) => setForm(prev => ({ ...prev, cookTime: e.target.value }))}
                placeholder="Cooking time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPerServing">Cost Per Serving ($)</Label>
              <Input
                id="costPerServing"
                type="number"
                step="0.01"
                min="0"
                value={form.costPerServing}
                onChange={(e) => setForm(prev => ({ ...prev, costPerServing: e.target.value }))}
                placeholder="Cost per serving"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price ($)</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => setForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                placeholder="Selling price"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the recipe"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={form.instructions}
              onChange={(e) => setForm(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Step-by-step cooking instructions"
              rows={4}
            />
          </div>

          <Separator />

          {/* Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Recipe Ingredients</h3>
              <Button type="button" onClick={addIngredient} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            {ingredients.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No ingredients added yet.</p>
                    <p className="text-sm">Click "Add Ingredient" to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ingredients.map((ingredient, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Raw Material *</Label>
                          <Select 
                            value={ingredient.rawMaterialId} 
                            onValueChange={(value) => updateIngredient(index, 'rawMaterialId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map((material) => (
                                <SelectItem key={material.id} value={material.id}>
                                  {material.name} ({material.baseUnit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            placeholder="0.0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Unit *</Label>
                          <Select 
                            value={ingredient.unit} 
                            onValueChange={(value) => updateIngredient(index, 'unit', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                                Metric (Preferred)
                              </div>
                              {availableUnits.filter(u => u.category.startsWith('metric')).map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-t mt-1 pt-2">
                                Imperial (Auto-converted)
                              </div>
                              {availableUnits.filter(u => u.category.startsWith('imperial')).map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-t mt-1 pt-2">
                                Count
                              </div>
                              {availableUnits.filter(u => u.category === 'count').map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isImperialUnit(ingredient.unit) && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                              Will convert to metric
                            </Badge>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {mutation.isPending ? "Updating..." : "Update Recipe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}