import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getImperialDisplayUnit, getMetricStorageUnit, imperialToMetric, metricToImperial } from "@/lib/unitConversion";
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
import { ShoppingCart, Upload, FileText, Plus, Trash2, DollarSign, Calendar, User, Building2, Save, Trash } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
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
    unit: z.string().min(1, "Unit is required"),
    pricePerUnit: z.string().min(1, "Price per unit is required"),
    totalPrice: z.string().min(1, "Total price is required"),
  })).min(1, "At least one item is required"),
});

const receiptUploadSchema = z.object({
  vendorName: z.string().optional(),
  notes: z.string().optional(),
});

const receiptPurchaseSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  totalAmount: z.string().min(1, "Total amount is required"),
  notes: z.string().optional(),
  items: z.array(z.object({
    name: z.string().min(1, "Item name is required"),
    rawMaterialId: z.string().min(1, "Raw material is required"),
    quantity: z.string().min(1, "Quantity is required"),
    unit: z.string().min(1, "Unit is required"),
    pricePerUnit: z.string().min(1, "Price per unit is required"),
    totalPrice: z.string().min(1, "Total price is required"),
  })).min(1, "At least one item is required"),
});

type ManualPurchaseForm = z.infer<typeof manualPurchaseSchema>;
type ReceiptUploadForm = z.infer<typeof receiptUploadSchema>;
type ReceiptPurchaseForm = z.infer<typeof receiptPurchaseSchema>;

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
  const receiptUploadForm = useForm<ReceiptUploadForm>({
    resolver: zodResolver(receiptUploadSchema),
    defaultValues: {
      vendorName: "",
      notes: "",
    },
  });

  // Form for receipt purchase (editable analysis results)
  const receiptForm = useForm<ReceiptPurchaseForm>({
    resolver: zodResolver(receiptPurchaseSchema),
    defaultValues: {
      vendorName: "",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      totalAmount: "",
      notes: "",
      items: [],
    },
  });

  // Field arrays for form management
  const { fields: manualFields, append: appendManual, remove: removeManual } = useFieldArray({
    control: manualForm.control,
    name: "items",
  });

  const { fields: receiptFields, append: appendReceipt, remove: removeReceipt } = useFieldArray({
    control: receiptForm.control,
    name: "items",
  });

  // Manual purchase submission
  const manualPurchaseMutation = useMutation({
    mutationFn: async (data: ManualPurchaseForm) => {
      // Calculate total from items
      const itemsTotal = data.items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.totalPrice) || 0);
      }, 0);
      
      const purchaseData = {
        restaurantId: selectedRestaurant,
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber || null,
        purchaseDate: new Date(data.purchaseDate),
        totalAmount: itemsTotal, // Use calculated total instead of form field
        tax: data.tax ? parseFloat(data.tax) : null,
        notes: data.notes || null,
        processingMethod: "manual",
        items: data.items.map(item => {
          const quantity = parseFloat(item.quantity);
          const rawMaterial = rawMaterials.find(rm => rm.id === item.rawMaterialId);
          
          // Convert imperial input to metric for storage
          const metricQuantity = imperialToMetric(quantity, item.unit);
          const metricUnit = getMetricStorageUnit(item.unit);
          
          return {
            rawMaterialId: item.rawMaterialId,
            itemName: rawMaterial?.name || "Unknown",
            quantity: metricQuantity,
            unit: metricUnit,
            pricePerUnit: parseFloat(item.pricePerUnit),
            totalPrice: parseFloat(item.totalPrice),
            needsMatching: false,
            confidence: 1.0,
          };
        }),
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
      // Using Replit Auth session instead of Firebase
      // No need to check authentication here - session is handled by server
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('restaurantId', selectedRestaurant);

      const response = await fetch(`/api/restaurants/${selectedRestaurant}/analyze-receipt`, {
        method: 'POST',
        credentials: 'include', // Use session-based auth instead of token
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Receipt analysis failed');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      setReceiptAnalysis(result);
      setIsAnalyzing(false);
      
      // Populate the receipt form with analyzed data
      receiptForm.reset({
        vendorName: result.vendorName || "",
        invoiceNumber: result.invoiceNumber || "",
        purchaseDate: result.purchaseDate ? new Date(result.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        totalAmount: result.totalAmount?.toString() || "",
        notes: "",
        items: result.items?.map((item: any) => ({
          name: item.name || "",
          rawMaterialId: item.suggestedRawMaterial?.id || "",
          quantity: item.quantity?.toString() || "",
          unit: item.unit || "",
          pricePerUnit: item.pricePerUnit?.toString() || "",
          totalPrice: item.totalPrice?.toString() || "",
        })) || [],
      });
      
      toast({
        title: "Success",
        description: `Receipt analyzed with ${(result.confidence * 100).toFixed(0)}% confidence`,
      });
    },
    onError: (error: Error) => {
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze receipt",
        variant: "destructive",
      });
    },
  });

  // Save purchase mutation (for receipt analysis results)
  const savePurchaseMutation = useMutation({
    mutationFn: async (data: ReceiptPurchaseForm) => {
      // Calculate total from items if totalAmount is 0 or missing
      const itemsTotal = data.items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.totalPrice) || 0);
      }, 0);
      
      const finalTotal = (data.totalAmount && parseFloat(data.totalAmount) > 0) ? parseFloat(data.totalAmount) : itemsTotal;
      
      const purchaseData = {
        restaurantId: selectedRestaurant,
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber || null,
        purchaseDate: new Date(data.purchaseDate),
        totalAmount: finalTotal,
        tax: null,
        notes: data.notes || null,
        processingMethod: "ai_scanned",
        items: data.items.map(item => {
          const quantity = parseFloat(item.quantity);
          
          // Convert imperial input to metric for storage
          const metricQuantity = imperialToMetric(quantity, item.unit);
          const metricUnit = getMetricStorageUnit(item.unit);
          
          return {
            rawMaterialId: item.rawMaterialId,
            itemName: item.name,
            quantity: metricQuantity,
            unit: metricUnit,
            pricePerUnit: parseFloat(item.pricePerUnit),
            totalPrice: parseFloat(item.totalPrice),
            needsMatching: !item.rawMaterialId,
            confidence: receiptAnalysis?.items?.find((ai: any) => ai.name === item.name)?.confidence || 0.8,
          };
        }),
      };

      return await apiRequest(`/api/restaurants/${selectedRestaurant}/purchases`, {
        method: "POST",
        body: JSON.stringify(purchaseData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase saved and inventory updated successfully",
      });
      receiptForm.reset();
      setReceiptAnalysis(null);
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
        description: "Failed to save purchase",
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
        setReceiptAnalysis(null); // Clear previous results
        receiptAnalysisMutation.mutate(file);
      } else {
        toast({
          title: "Error",
          description: "Please select an image file (JPEG, PNG)",
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

  // Add/remove items in receipt form
  const addReceiptItem = () => {
    appendReceipt({
      name: "",
      rawMaterialId: "",
      quantity: "",
      unit: "",
      pricePerUnit: "",
      totalPrice: "",
    });
  };

  const removeReceiptItem = (index: number) => {
    removeReceipt(index);
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
                          <Button type="button" onClick={() => appendManual({ rawMaterialId: "", quantity: "", unit: "", pricePerUnit: "", totalPrice: "" })} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </div>

                        {manualFields.map((field, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                            <FormField
                              control={manualForm.control}
                              name={`items.${index}.rawMaterialId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Raw Material</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    // Update unit field when raw material is selected
                                    const selectedMaterial = rawMaterials.find(m => m.id === value);
                                    if (selectedMaterial?.baseUnit) {
                                      // Set the imperial display unit
                                      manualForm.setValue(`items.${index}.unit`, getImperialDisplayUnit(selectedMaterial.baseUnit));
                                    }
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select material" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {rawMaterials.map((material) => (
                                        <SelectItem key={material.id} value={material.id}>
                                          {material.name}{material.baseUnit ? ` (${getImperialDisplayUnit(material.baseUnit)})` : ''}
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
                              name={`items.${index}.unit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="lbs, oz, gal..." />
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
                                onClick={() => removeManual(index)}
                                disabled={manualFields.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

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

                      {/* Manual Total Amount Display */}
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Total Amount:</span>
                          <span className="text-green-600">
                            ${(() => {
                              const itemsTotal = manualFields.reduce((sum, _, index) => {
                                const totalPrice = manualForm.watch(`items.${index}.totalPrice`) || 0;
                                return sum + Number(totalPrice);
                              }, 0);
                              return itemsTotal.toFixed(2);
                            })()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Calculated from items
                        </p>
                      </div>

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
                        <CardTitle>Review & Edit Receipt Analysis</CardTitle>
                        <p className="text-sm text-slate-600">
                          Review the extracted information and make any necessary corrections before saving
                        </p>
                      </CardHeader>
                      <CardContent>
                        <Form {...receiptForm}>
                          <form onSubmit={receiptForm.handleSubmit((data) => savePurchaseMutation.mutate(data))} className="space-y-6">
                            {/* Purchase Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={receiptForm.control}
                                name="vendorName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Vendor Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={receiptForm.control}
                                name="totalAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Total Amount</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={receiptForm.control}
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
                                control={receiptForm.control}
                                name="invoiceNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Invoice Number (Optional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={receiptForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Add any notes about this purchase..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Separator />

                            {/* Purchase Items */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Purchase Items</Label>
                                <Badge variant="outline">
                                  AI Confidence: {(receiptAnalysis.confidence * 100).toFixed(0)}%
                                </Badge>
                              </div>

                              {receiptForm.watch("items").map((_, index) => (
                                <div key={index} className="p-4 border rounded-lg space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                      control={receiptForm.control}
                                      name={`items.${index}.name`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Item Name</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={receiptForm.control}
                                      name={`items.${index}.rawMaterialId`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Raw Material</FormLabel>
                                          <Select onValueChange={(value) => {
                                            field.onChange(value);
                                            // Update unit field when raw material is selected
                                            const selectedMaterial = rawMaterials.find(m => m.id === value);
                                            if (selectedMaterial?.baseUnit) {
                                              // Set the imperial display unit
                                              receiptForm.setValue(`items.${index}.unit`, getImperialDisplayUnit(selectedMaterial.baseUnit));
                                            }
                                          }} defaultValue={field.value}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select raw material" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {rawMaterials.map((material: any) => (
                                                <SelectItem key={material.id} value={material.id}>
                                                  {material.name}{material.baseUnit ? ` (${getImperialDisplayUnit(material.baseUnit)})` : ''}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField
                                      control={receiptForm.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Quantity</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={receiptForm.control}
                                      name={`items.${index}.unit`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Unit</FormLabel>
                                          <FormControl>
                                            <Input {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={receiptForm.control}
                                      name={`items.${index}.pricePerUnit`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Price per Unit</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={receiptForm.control}
                                      name={`items.${index}.totalPrice`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Total Price</FormLabel>
                                          <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="text-sm text-slate-600">
                                      {receiptAnalysis.items?.[index]?.suggestedRawMaterial ? (
                                        <Badge variant="secondary" className="text-xs">
                                          AI suggested: {receiptAnalysis.items[index].suggestedRawMaterial.name} 
                                          ({(receiptAnalysis.items[index].matchConfidence * 100).toFixed(0)}% match)
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">
                                          No matching raw material found
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeReceiptItem(index)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}

                              <Button type="button" onClick={addReceiptItem} variant="outline" className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                            </div>

                            {/* Receipt Total Amount Display */}
                            <div className="bg-gray-50 rounded-lg p-4 border">
                              <div className="flex justify-between items-center text-lg font-semibold">
                                <span>Total Amount:</span>
                                <span className="text-green-600">
                                  ${(() => {
                                    const receiptTotal = receiptForm.watch("totalAmount");
                                    const itemsTotal = receiptFields.reduce((sum, _, index) => {
                                      const totalPrice = receiptForm.watch(`items.${index}.totalPrice`) || 0;
                                      return sum + Number(totalPrice);
                                    }, 0);
                                    
                                    // Use receipt total if available and greater than 0, otherwise sum items
                                    const finalTotal = receiptTotal > 0 ? receiptTotal : itemsTotal;
                                    return finalTotal.toFixed(2);
                                  })()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {receiptForm.watch("totalAmount") > 0 
                                  ? "From receipt scan" 
                                  : "Calculated from items"}
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <Button type="submit" className="flex-1" disabled={savePurchaseMutation.isPending}>
                                {savePurchaseMutation.isPending ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Saving Purchase...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Purchase & Update Inventory
                                  </>
                                )}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setReceiptAnalysis(null)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </Form>
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