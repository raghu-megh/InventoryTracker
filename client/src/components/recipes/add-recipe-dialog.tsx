import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ChefHat, Trash2 } from "lucide-react";

interface AddRecipeDialogProps {
  restaurantId: string;
  rawMaterials: any[];
}

interface RecipeIngredient {
  rawMaterialId: string;
  quantity: number;
  unit: string;
}

export function AddRecipeDialog({ restaurantId, rawMaterials }: AddRecipeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    servings: '',
    prepTime: '',
    cookTime: '',
    difficulty: '',
    instructions: '',
    costPerServing: '',
    sellingPrice: '',
    isActive: true
  });

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Available units (metric and imperial)
  const availableUnits = [
    // Weight - Metric
    { value: 'kg', label: 'Kilograms (kg)', category: 'weight' },
    { value: 'g', label: 'Grams (g)', category: 'weight' },
    // Weight - Imperial
    { value: 'lbs', label: 'Pounds (lbs)', category: 'weight' },
    { value: 'oz', label: 'Ounces (oz)', category: 'weight' },
    // Volume - Metric
    { value: 'l', label: 'Liters (l)', category: 'volume' },
    { value: 'ml', label: 'Milliliters (ml)', category: 'volume' },
    // Volume - Imperial
    { value: 'gallon', label: 'Gallons', category: 'volume' },
    { value: 'quart', label: 'Quarts', category: 'volume' },
    { value: 'pint', label: 'Pints', category: 'volume' },
    { value: 'cups', label: 'Cups', category: 'volume' },
    { value: 'fl oz', label: 'Fluid Ounces', category: 'volume' },
    { value: 'tbsp', label: 'Tablespoons', category: 'volume' },
    { value: 'tsp', label: 'Teaspoons', category: 'volume' },
    // Count
    { value: 'pieces', label: 'Pieces', category: 'count' },
  ];

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/restaurants/${restaurantId}/recipes`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recipe created successfully",
      });
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'recipes'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create recipe",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      category: '',
      servings: '',
      prepTime: '',
      cookTime: '',
      difficulty: '',
      instructions: '',
      costPerServing: '',
      sellingPrice: '',
      isActive: true
    });
    setIngredients([]);
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { rawMaterialId: '', quantity: 0, unit: '' }]);
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
      !ing.rawMaterialId || !ing.quantity || !ing.unit
    );

    if (invalidIngredients) {
      toast({
        title: "Error",
        description: "All ingredients must have material, quantity, and unit selected",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...form,
      servings: form.servings ? parseInt(form.servings) : 1,
      prepTime: form.prepTime ? parseInt(form.prepTime) : null,
      cookTime: form.cookTime ? parseInt(form.cookTime) : null,
      costPerServing: form.costPerServing ? parseFloat(form.costPerServing) : null,
      sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
      ingredients: ingredients.map(ing => ({
        rawMaterialId: ing.rawMaterialId,
        quantity: Number(ing.quantity),
        unit: ing.unit
      }))
    };

    mutation.mutate(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Add New Recipe
          </DialogTitle>
          <DialogDescription>
            Create a new recipe with ingredients. Units will be converted to metric for consistency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Recipe Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Margherita Pizza, Caesar Salad"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appetizer">Appetizer</SelectItem>
                    <SelectItem value="main">Main Course</SelectItem>
                    <SelectItem value="side">Side Dish</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                    <SelectItem value="sauce">Sauce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the dish"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Recipe Details */}
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  placeholder="4"
                  value={form.servings}
                  onChange={(e) => setForm(prev => ({ ...prev, servings: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prepTime">Prep Time (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min="0"
                  placeholder="15"
                  value={form.prepTime}
                  onChange={(e) => setForm(prev => ({ ...prev, prepTime: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cookTime">Cook Time (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  min="0"
                  placeholder="30"
                  value={form.cookTime}
                  onChange={(e) => setForm(prev => ({ ...prev, cookTime: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select onValueChange={(value) => setForm(prev => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="costPerServing">Cost per Serving ($)</Label>
                <Input
                  id="costPerServing"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5.50"
                  value={form.costPerServing}
                  onChange={(e) => setForm(prev => ({ ...prev, costPerServing: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sellingPrice">Selling Price ($)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="12.99"
                  value={form.sellingPrice}
                  onChange={(e) => setForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                />
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Ingredients *</Label>
                <Button type="button" onClick={addIngredient} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
              
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-5">
                    <Label>Raw Material</Label>
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
                            {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Label>Unit</Label>
                    <Select 
                      value={ingredient.unit} 
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="text-xs font-medium text-gray-500 px-2 py-1">Weight</div>
                        {availableUnits.filter(u => u.category === 'weight').map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                        <div className="text-xs font-medium text-gray-500 px-2 py-1 mt-2">Volume</div>
                        {availableUnits.filter(u => u.category === 'volume').map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                        <div className="text-xs font-medium text-gray-500 px-2 py-1 mt-2">Count</div>
                        {availableUnits.filter(u => u.category === 'count').map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {ingredients.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No ingredients added yet</p>
                  <Button type="button" onClick={addIngredient} size="sm" variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Ingredient
                  </Button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="grid gap-2">
              <Label htmlFor="instructions">Cooking Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Step-by-step cooking instructions..."
                value={form.instructions}
                onChange={(e) => setForm(prev => ({ ...prev, instructions: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Recipe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}