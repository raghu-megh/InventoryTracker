import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Upload, FileText, Plus, Trash2, DollarSign, Calendar, User, Building2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form schemas
const manualPurchaseSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  totalAmount: z.string().min(1, "Total amount is required"),
  tax: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    rawMaterialId: z.string().min(1, "Raw material is required"),
    quantity: z.string().min(1, "Quantity is required"),
    pricePerUnit: z.string().min(1, "Price per unit is required"),
    totalPrice: z.string().min(1, "Total price is required"),
  })).min(1, "At least one item is required"),
});

const receiptUploadSchema = z.object({
  vendorName: z.string().optional(),
  notes: z.string().optional(),
});

type ManualPurchaseForm = z.infer<typeof manualPurchaseSchema>;
type ReceiptUploadForm = z.infer<typeof receiptUploadSchema>;

export default function Purchasing() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptAnalysis, setReceiptAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // Fetch raw materials for the selected restaurant
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "raw-materials"],
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

  // Fetch recent purchases
  const { data: purchases = [] } = useQuery({
    queryKey: ["/api/restaurants", selectedRestaurant, "purchases"],
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

  // Form for manual purchase entry
  const manualForm = useForm<ManualPurchaseForm>({
    resolver: zodResolver(manualPurchaseSchema),
    defaultValues: {
      vendorName: "",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      totalAmount: "",
      tax: "",
      notes: "",
      items: [{ rawMaterialId: "", quantity: "", pricePerUnit: "", totalPrice: "" }],
    },
  });

  // Form for receipt upload
  const receiptForm = useForm<ReceiptUploadForm>({
    resolver: zodResolver(receiptUploadSchema),
    defaultValues: {
      vendorName: "",
      notes: "",
    },
  });

  // Manual purchase submission
  const manualPurchaseMutation = useMutation({
    mutationFn: async (data: ManualPurchaseForm) => {
      const purchaseData = {
        restaurantId: selectedRestaurant,
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber || null,
        purchaseDate: new Date(data.purchaseDate),
        totalAmount: parseFloat(data.totalAmount),
        tax: data.tax ? parseFloat(data.tax) : null,
        notes: data.notes || null,
        processingMethod: "manual",
        items: data.items.map(item => ({
          rawMaterialId: item.rawMaterialId,
          itemName: rawMaterials.find(rm => rm.id === item.rawMaterialId)?.name || "Unknown",
          quantity: parseFloat(item.quantity),
          unit: rawMaterials.find(rm => rm.id === item.rawMaterialId)?.baseUnit || "pieces",
          pricePerUnit: parseFloat(item.pricePerUnit),
          totalPrice: parseFloat(item.totalPrice),
          needsMatching: false,
          confidence: 1.0,
        })),
      };

      return await apiRequest(`/api/restaurants/${selectedRestaurant}/purchases`, {
        method: "POST",
        body: JSON.stringify(purchaseData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase recorded successfully",
      });
      manualForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", selectedRestaurant, "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", selectedRestaurant, "raw-materials"] });
    },
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
        description: "Failed to record purchase",
        variant: "destructive",
      });
    },
  });

  // Receipt analysis mutation
  const receiptAnalysisMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('restaurantId', selectedRestaurant);

      const response = await fetch(`/api/restaurants/${selectedRestaurant}/analyze-receipt`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Receipt analysis failed');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      setReceiptAnalysis(result);
      toast({
        title: "Success",
        description: "Receipt analyzed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to analyze receipt",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setIsAnalyzing(true);
        receiptAnalysisMutation.mutate(file);
      } else {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
      }
    }
  };

  // Add/remove items in manual form
  const addItem = () => {
    const currentItems = manualForm.getValues("items");
    manualForm.setValue("items", [
      ...currentItems,
      { rawMaterialId: "", quantity: "", pricePerUnit: "", totalPrice: "" }
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = manualForm.getValues("items");
    if (currentItems.length > 1) {
      manualForm.setValue("items", currentItems.filter((_, i) => i !== index));
    }
  };

  // Calculate total price when quantity or price per unit changes
  const calculateTotalPrice = (index: number) => {
    const items = manualForm.getValues("items");
    const item = items[index];
    const quantity = parseFloat(item.quantity) || 0;
    const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
    const totalPrice = (quantity * pricePerUnit).toFixed(2);
    
    manualForm.setValue(`items.${index}.totalPrice`, totalPrice);
    
    // Update overall total
    const overallTotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.totalPrice) || 0);
    }, 0);
    manualForm.setValue("totalAmount", overallTotal.toFixed(2));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar 
        user={user} 
        selectedRestaurant={selectedRestaurant}
        onRestaurantChange={setSelectedRestaurant}
      />
      
      <main className="pl-64">
        <Header 
          title="Raw Materials Purchasing"
          subtitle="Record new purchases manually or via receipt scanning"
        />
        
        <div className="p-6 space-y-6">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual" className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Manual Entry</span>
              </TabsTrigger>
              <TabsTrigger value="receipt" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Receipt Scan</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Purchase History</span>
              </TabsTrigger>
            </TabsList>

            {/* Manual Entry Tab */}
            <TabsContent value="manual">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Purchase Entry</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...manualForm}>
                    <form onSubmit={manualForm.handleSubmit((data) => manualPurchaseMutation.mutate(data))} className="space-y-6">
                      {/* Purchase Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={manualForm.control}
                          name="vendorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendor Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter vendor name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={manualForm.control}
                          name="invoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Number (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter invoice number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={manualForm.control}
                          name="purchaseDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchase Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={manualForm.control}
                          name="tax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Amount (Optional)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Purchase Items */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">Purchase Items</Label>
                          <Button type="button" onClick={addItem} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </div>

                        {manualForm.watch("items").map((_, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                            <FormField
                              control={manualForm.control}
                              name={`items.${index}.rawMaterialId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Raw Material</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select material" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {rawMaterials.map((material) => (
                                        <SelectItem key={material.id} value={material.id}>
                                          {material.name} ({material.baseUnit})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={manualForm.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.001" 
                                      placeholder="0" 
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setTimeout(() => calculateTotalPrice(index), 100);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={manualForm.control}
                              name={`items.${index}.pricePerUnit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price per Unit</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="0.00" 
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setTimeout(() => calculateTotalPrice(index), 100);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={manualForm.control}
                              name={`items.${index}.totalPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Total Price</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} readOnly />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex items-end">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => removeItem(index)}
                                disabled={manualForm.watch("items").length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Amount */}
                      <FormField
                        control={manualForm.control}
                        name="totalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Amount</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Notes */}
                      <FormField
                        control={manualForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Additional notes about this purchase" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" disabled={manualPurchaseMutation.isPending}>
                        {manualPurchaseMutation.isPending ? "Recording..." : "Record Purchase"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipt Scan Tab */}
            <TabsContent value="receipt">
              <Card>
                <CardHeader>
                  <CardTitle>Receipt Scanning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium mb-2">Upload Receipt Image</p>
                    <p className="text-slate-600 mb-4">
                      Take a photo or upload an image of your receipt for automatic processing
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="max-w-sm mx-auto"
                    />
                  </div>

                  {/* Analysis Result */}
                  {receiptAnalysisMutation.isPending && (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-600">Analyzing receipt with AI...</p>
                    </div>
                  )}

                  {receiptAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Vendor</Label>
                            <p className="text-lg">{receiptAnalysis.vendorName}</p>
                          </div>
                          <div>
                            <Label>Total</Label>
                            <p className="text-lg">${receiptAnalysis.totalAmount?.toFixed(2)}</p>
                          </div>
                          <div>
                            <Label>Date</Label>
                            <p className="text-lg">{new Date(receiptAnalysis.purchaseDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label>Confidence</Label>
                            <Badge variant={receiptAnalysis.confidence > 0.8 ? "default" : "secondary"}>
                              {(receiptAnalysis.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <Label className="text-base font-medium">Detected Items</Label>
                          <div className="space-y-2 mt-2">
                            {receiptAnalysis.items?.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-slate-600">
                                    {item.quantity} {item.unit} × ${item.pricePerUnit?.toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">${item.totalPrice?.toFixed(2)}</p>
                                  <Badge variant="outline" size="sm">
                                    {(item.confidence * 100).toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button className="w-full">
                          Review & Save Purchase
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Purchase History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Purchase History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {purchases.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                        <p className="text-lg font-medium mb-2">No purchases recorded</p>
                        <p className="text-slate-600">
                          Start by recording your first purchase using manual entry or receipt scanning
                        </p>
                      </div>
                    ) : (
                      purchases.map((purchase: any) => (
                        <Card key={purchase.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-4">
                                  <Building2 className="h-4 w-4 text-slate-500" />
                                  <span className="font-medium">{purchase.vendorName}</span>
                                  <Badge variant={purchase.processingMethod === 'manual' ? 'outline' : 'default'}>
                                    {purchase.processingMethod === 'manual' ? 'Manual' : 'AI Scanned'}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-slate-600">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <User className="h-3 w-3" />
                                    <span>{purchase.user?.firstName} {purchase.user?.lastName}</span>
                                  </div>
                                  {purchase.invoiceNumber && (
                                    <span>Invoice: {purchase.invoiceNumber}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-1">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="text-lg font-semibold">${purchase.totalAmount}</span>
                                </div>
                                <p className="text-sm text-slate-600">
                                  {purchase.items?.length || 0} items
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}