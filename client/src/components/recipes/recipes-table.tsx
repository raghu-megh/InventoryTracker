import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Eye, 
  Edit, 
  Clock, 
  Users, 
  DollarSign,
  ChefHat,
  TrendingUp
} from "lucide-react";

interface RecipesTableProps {
  recipes: any[];
  isLoading: boolean;
  onViewRecipe: (recipe: any) => void;
}

export function RecipesTable({ recipes, isLoading, onViewRecipe }: RecipesTableProps) {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recipes Found</h3>
            <p className="text-gray-600 mb-6">Start by creating your first recipe to build your menu.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRecipes = [...recipes].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

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

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  Recipe Name
                  {sortField === 'name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('servings')}
                >
                  <Users className="h-4 w-4 inline mr-1" />
                  Servings
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('prepTime')}
                >
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('costPerServing')}
                >
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Cost
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('sellingPrice')}
                >
                  Price
                </TableHead>
                <TableHead>
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  Margin
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecipes.map((recipe) => {
                const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
                const profitMargin = calculateProfitMargin(recipe.costPerServing, recipe.sellingPrice);
                
                return (
                  <TableRow key={recipe.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{recipe.name}</div>
                        {recipe.description && (
                          <div className="text-sm text-gray-600 truncate max-w-48">
                            {recipe.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipe.category && (
                        <Badge className={getCategoryColor(recipe.category)}>
                          {recipe.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipe.difficulty && (
                        <Badge className={getDifficultyColor(recipe.difficulty)}>
                          {recipe.difficulty}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{recipe.servings || '-'}</TableCell>
                    <TableCell>
                      {totalTime > 0 ? `${totalTime}m` : '-'}
                      {recipe.prepTime && recipe.cookTime && (
                        <div className="text-xs text-gray-500">
                          {recipe.prepTime}m prep + {recipe.cookTime}m cook
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipe.costPerServing ? `$${recipe.costPerServing.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {recipe.sellingPrice ? `$${recipe.sellingPrice.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {profitMargin ? (
                        <span className={`font-medium ${
                          parseFloat(profitMargin) > 60 ? 'text-green-600' :
                          parseFloat(profitMargin) > 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {profitMargin}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewRecipe(recipe)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}