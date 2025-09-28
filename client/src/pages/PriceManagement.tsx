import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { insertProductSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { Plus, Edit3, TrendingUp, Clock, Calendar, AlertTriangle, Download, Save, History, Bell, Trash2 } from "lucide-react";

export default function PriceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currencyConfig } = useCurrency();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [priceEditOpen, setPriceEditOpen] = useState(false);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedProductForSchedule, setSelectedProductForSchedule] = useState<Product | null>(null);

  const form = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      category: "fuel",
      unit: "litre",
      currentPrice: "0",
      density: "0.750",
      hsnCode: "",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "New product has been added successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createProductMutation.mutate(data);
  };

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const updatePriceMutation = useMutation({
    mutationFn: async ({ productId, newPrice }: { productId: string; newPrice: number }) => {
      const response = await apiRequest("PUT", `/api/products/${productId}`, {
        currentPrice: newPrice.toString()
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Price updated",
        description: "Product price updated successfully",
      });
      setPriceEditOpen(false);
      setSelectedProductForPrice(null);
      setNewPrice("");
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Price update failed",
        description: "Failed to update product price",
        variant: "destructive",
      });
    },
  });

  const handleEditPrice = (product: Product) => {
    setSelectedProductForPrice(product);
    setNewPrice(product.currentPrice || "0");
    setPriceEditOpen(true);
  };

  const handleUpdatePrice = () => {
    if (selectedProductForPrice && newPrice) {
      updatePriceMutation.mutate({
        productId: selectedProductForPrice.id,
        newPrice: parseFloat(newPrice)
      });
    }
  };

  const handleViewHistory = (product: Product) => {
    setSelectedProductForPrice(product);
    setPriceHistoryOpen(true);
  };

  const handleSchedulePrice = (product: Product) => {
    setSelectedProductForSchedule(product);
    setScheduleDialogOpen(true);
  };

  const handleBulkUpdate = () => {
    setBulkUpdateOpen(true);
  };

  const handlePriceHistory = () => {
    setPriceHistoryOpen(true);
  };

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await apiRequest("DELETE", `/api/products/${productId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "Product has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteProductMutation.mutate(productId);
    }
  };

  // Get available tanks for a product
  const getProductTanks = (productId: string) => {
    return tanks.filter(tank => tank.productId === productId && parseFloat(tank.currentStock || '0') > 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Price Management</h3>
          <p className="text-muted-foreground">Manage product pricing and profit margins</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} data-testid="input-product-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-product-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fuel">Fuel</SelectItem>
                              <SelectItem value="lubricant">Lubricant</SelectItem>
                              <SelectItem value="additive">Additive</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-product-unit">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="litre">Litre</SelectItem>
                              <SelectItem value="kilogram">Kilogram</SelectItem>
                              <SelectItem value="piece">Piece</SelectItem>
                              <SelectItem value="bottle">Bottle</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ({currencyConfig?.symbol || '₨'}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-product-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hsnCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>HSN Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter HSN code" {...field} data-testid="input-product-hsn" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="density"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Density (for fuels)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.001" placeholder="0.750" {...field} data-testid="input-product-density" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProductMutation.isPending} data-testid="button-submit-product">
                      {createProductMutation.isPending ? "Creating..." : "Create Product"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={handleBulkUpdate} data-testid="button-bulk-price-update">
            <Download className="w-4 h-4 mr-2" />
            Bulk Update
          </Button>
          <Button variant="outline" onClick={handlePriceHistory} data-testid="button-price-history">
            <TrendingUp className="w-4 h-4 mr-2" />
            Price History
          </Button>
        </div>
      </div>

      {/* Market Prices Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Market Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.slice(0, 3).map((product: Product, index: number) => {
              const colors = [
                { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', label: 'text-green-700', change: 'text-green-600' },
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', label: 'text-blue-700', change: 'text-blue-600' },
                { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', label: 'text-purple-700', change: 'text-purple-600' }
              ];
              const color = colors[index % colors.length];

              return (
                <div key={product.id} className={`p-4 ${color.bg} rounded-lg border ${color.border}`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${color.text}`} data-testid={`market-${product.name.toLowerCase()}-price`}>
                      ₹{parseFloat(product.currentPrice || '0').toFixed(2)}
                    </div>
                    <div className={`text-sm ${color.label}`}>{product.name} - Current Rate</div>
                    <div className={`text-xs ${color.change} mt-1`}>→ Market rate</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Product Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Price Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-center p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Cost Price</th>
                  <th className="text-right p-3 font-medium">Selling Price</th>
                  <th className="text-right p-3 font-medium">Margin</th>
                  <th className="text-center p-3 font-medium">Last Updated</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? products.map((product: Product, index: number) => {
                  const currentPrice = parseFloat(product.currentPrice || '0');
                  const estimatedCost = currentPrice * 0.95; // Estimated cost is 95% of selling price
                  const marginPercentage = ((currentPrice - estimatedCost) / estimatedCost * 100).toFixed(2);

                  return (
                    <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground" data-testid={`product-name-${index}`}>
                          {product.name}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" data-testid={`product-category-${index}`}>
                          {product.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono" data-testid={`cost-price-${index}`}>
                        ₹{estimatedCost.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-semibold font-mono" data-testid={`selling-price-${index}`}>
                            ₹{currentPrice.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${parseFloat(marginPercentage) > 5 ? 'text-green-600' :
                                      parseFloat(marginPercentage) > 2 ? 'text-orange-600' : 'text-red-600'}`}
                              data-testid={`margin-${index}`}>
                          {marginPercentage}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={product.isActive ? 'default' : 'secondary'}
                          className={product.isActive ? 'bg-green-100 text-green-800' : ''}
                          data-testid={`product-status-${index}`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleEditPrice(product)}
                            data-testid={`button-edit-price-${index}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-50"
                            onClick={() => handleViewHistory(product)}
                            data-testid={`button-history-${index}`}
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                            onClick={() => handleSchedulePrice(product)}
                            data-testid={`button-schedule-${index}`}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => handleDeleteProduct(product.id)}
                            data-testid={`button-delete-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Price Change Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Price Change Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <TrendingUp className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-green-800">Price Increase</div>
                  <div className="text-xs text-green-600">
                    Petrol price increased by ₹0.50 to ₹110.50 per liter effective from today
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <TrendingUp className="w-4 h-4 text-red-500 mr-2 mt-0.5 rotate-180" />
                <div>
                  <div className="text-sm font-medium text-red-800">Price Decrease</div>
                  <div className="text-xs text-red-600">
                    Diesel price decreased by ₹0.25 to ₹84.25 per liter effective from today
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-yellow-800">Margin Alert</div>
                  <div className="text-xs text-yellow-600">
                    Diesel margin has dropped below 3%. Consider adjusting selling price.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Edit Dialog */}
      <Dialog open={priceEditOpen} onOpenChange={setPriceEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Price - {selectedProductForPrice?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Price</label>
              <div className="text-lg font-semibold text-muted-foreground">
                {selectedProductForPrice && `₹${parseFloat(selectedProductForPrice.currentPrice || '0').toFixed(2)}`}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">New Price ({currencyConfig.symbol})</label>
              <Input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter new price"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPriceEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePrice}
                disabled={updatePriceMutation.isPending || !newPrice}
              >
                {updatePriceMutation.isPending ? "Updating..." : "Update Price"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateOpen} onOpenChange={setBulkUpdateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Price Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Update Multiple Products</h4>
              <p className="text-sm text-muted-foreground">
                Select products and apply percentage or fixed amount changes.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Update Type</Label>
                <Select defaultValue="percentage">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Change</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input placeholder="Enter percentage or amount" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setBulkUpdateOpen(false)}>
                Cancel
              </Button>
              <Button>Apply Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={priceHistoryOpen} onOpenChange={setPriceHistoryOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Price History {selectedProductForPrice ? `- ${selectedProductForPrice.name}` : 'Report'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Price Change History</h4>
              <p className="text-sm text-muted-foreground">
                Track price changes over time for better pricing decisions.
              </p>
            </div>
            <div className="space-y-2">
              {[
                { date: "2024-01-15", oldPrice: "285.00", newPrice: "290.00", reason: "Market adjustment" },
                { date: "2024-01-10", oldPrice: "280.00", newPrice: "285.00", reason: "Supplier cost increase" },
                { date: "2024-01-05", oldPrice: "275.00", newPrice: "280.00", reason: "Government tax revision" }
              ].map((change, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{change.date}</div>
                    <div className="text-sm text-muted-foreground">{change.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="line-through text-red-600">₹{change.oldPrice}</div>
                    <div className="font-semibold text-green-600">₹{change.newPrice}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setPriceHistoryOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Price Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Schedule Price Change {selectedProductForSchedule ? `- ${selectedProductForSchedule.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Price ({currencyConfig.symbol})</Label>
              <Input type="number" step="0.01" placeholder="Enter new price" />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="datetime-local" />
            </div>
            <div>
              <Label>Reason for Change</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market Adjustment</SelectItem>
                  <SelectItem value="supplier">Supplier Cost Change</SelectItem>
                  <SelectItem value="tax">Tax Revision</SelectItem>
                  <SelectItem value="promotion">Promotional Pricing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button>Schedule Change</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}