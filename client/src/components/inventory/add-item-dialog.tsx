import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddItemDialogProps {
  restaurantId: string;
}

export default function AddItemDialog({ restaurantId }: AddItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    unit: '',
    currentStock: '',
    minLevel: '',
    maxLevel: '',
    costPerUnit: '',
    categoryId: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get categories for the dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'categories'],
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', `/api/restaurants/${restaurantId}/inventory`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item created successfully!",
      });
      setIsOpen(false);
      setForm({
        name: '',
        description: '',
        sku: '',
        unit: '',
        currentStock: '',
        minLevel: '',
        maxLevel: '',
        costPerUnit: '',
        categoryId: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'inventory'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      toast({
        title: "Error",
        description: "Item name and unit are required",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...form,
      currentStock: form.currentStock ? parseFloat(form.currentStock) : 0,
      minLevel: form.minLevel ? parseFloat(form.minLevel) : 0,
      maxLevel: form.maxLevel ? parseFloat(form.maxLevel) || null : null,
      costPerUnit: form.costPerUnit ? parseFloat(form.costPerUnit) || null : null,
      categoryId: form.categoryId || null,
    };

    mutation.mutate(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Create a new inventory item to track stock levels.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Coffee Beans"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  type="text"
                  placeholder="e.g., CB-001"
                  value={form.sku}
                  onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional item description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm(prev => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  type="text"
                  placeholder="e.g., lbs, oz, pieces, gallons"
                  value={form.unit}
                  onChange={(e) => setForm(prev => ({ ...prev, unit: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={form.currentStock}
                  onChange={(e) => setForm(prev => ({ ...prev, currentStock: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minLevel">Min Level</Label>
                <Input
                  id="minLevel"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={form.minLevel}
                  onChange={(e) => setForm(prev => ({ ...prev, minLevel: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxLevel">Max Level</Label>
                <Input
                  id="maxLevel"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  value={form.maxLevel}
                  onChange={(e) => setForm(prev => ({ ...prev, maxLevel: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="costPerUnit">Cost Per Unit</Label>
              <Input
                id="costPerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.costPerUnit}
                onChange={(e) => setForm(prev => ({ ...prev, costPerUnit: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {mutation.isPending ? "Creating..." : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}