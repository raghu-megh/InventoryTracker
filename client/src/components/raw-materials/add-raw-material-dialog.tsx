import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Plus, Scale } from "lucide-react";

interface AddRawMaterialDialogProps {
  restaurantId: string;
  categories: any[];
}

export function AddRawMaterialDialog({ restaurantId, categories }: AddRawMaterialDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    sku: '',
    baseUnit: '',
    currentStock: '',
    minLevel: '',
    maxLevel: '',
    costPerUnit: '',
    categoryId: ''
  });

  // Get unit conversions for reference
  const { data: unitConversions = [] } = useQuery({
    queryKey: ['/api/unit-conversions'],
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/restaurants/${restaurantId}/raw-materials`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Raw material created successfully",
      });
      setIsOpen(false);
      setForm({
        name: '',
        description: '',
        sku: '',
        baseUnit: '',
        currentStock: '',
        minLevel: '',
        maxLevel: '',
        costPerUnit: '',
        categoryId: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'raw-materials'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create raw material",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.baseUnit.trim()) {
      toast({
        title: "Error",
        description: "Name and base unit are required",
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

  // Common metric units
  const metricUnits = [
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'l', label: 'Liters (l)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'pieces', label: 'Pieces' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Raw Material
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Add New Raw Material
          </DialogTitle>
          <DialogDescription>
            Create a new raw material. Units will be stored in metric system for consistency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Material Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Flour, Tomatoes, Ground Beef"
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
                  placeholder="e.g., FLOUR-001"
                  value={form.sku}
                  onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(value) => setForm(prev => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseUnit">Base Unit (Metric) *</Label>
                <Select onValueChange={(value) => setForm(prev => ({ ...prev, baseUnit: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricUnits.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  step="0.001"
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
                  step="0.001"
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
                  step="0.001"
                  min="0"
                  placeholder="Optional"
                  value={form.maxLevel}
                  onChange={(e) => setForm(prev => ({ ...prev, maxLevel: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="costPerUnit">Cost per Unit ($)</Label>
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
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Material"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}