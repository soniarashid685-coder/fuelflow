import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PurchaseOrder, Supplier, Product } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { Combobox } from "@/components/ui/combobox";
import { Eye, Edit, Printer, Trash2, Plus, Download, Filter, Search } from "lucide-react";
import { useLocation } from "wouter";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { PrintActions } from "@/components/ui/print-actions";
import { printReport } from "@/lib/printUtils";

const lineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.string().min(1, "Quantity is required").refine((val) => parseFloat(val) > 0, "Quantity must be greater than 0"),
  unitPrice: z.string().min(1, "Unit price is required").refine((val) => parseFloat(val) > 0, "Unit price must be greater than 0"),
});

const purchaseOrderSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().optional(),
  status: z.string().default("pending"),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

export default function PurchaseOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

  const form = useForm({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      orderNumber: `PO-${Date.now()}`,
      supplierId: "",
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: "",
      status: "pending",
      items: [{
        productId: "",
        quantity: "",
        unitPrice: "",
      }],
      notes: "",
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating purchase order with validated data:", data);

      if (!user?.stationId || !user?.id) {
        throw new Error("User session not loaded properly");
      }

      // Calculate totals from line items
      const subtotal = data.items.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')), 0
      );
      const taxAmount = 0; // No tax for now
      const totalAmount = subtotal + taxAmount;

      // Prepare line items with calculated totals
      const itemsWithTotals = data.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')).toString(),
      }));

      const orderData = {
        orderNumber: data.orderNumber,
        stationId: user.stationId,
        supplierId: data.supplierId,
        userId: user.id,
        orderDate: new Date(data.orderDate).toISOString(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString() : null,
        status: data.status,
        currencyCode: currencyConfig.code,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        notes: data.notes || "",
      };

      console.log("Final order data being sent:", orderData);
      console.log("Items being sent:", itemsWithTotals);

      const response = await apiRequest("POST", "/api/purchase-orders", { order: orderData, items: itemsWithTotals });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Failed to create purchase order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order created",
        description: "Purchase order has been created successfully",
      });
      setOpen(false);
      form.reset({
        orderNumber: `PO-${Date.now()}`,
        supplierId: "",
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: "",
        status: "pending",
        items: [{
          productId: "",
          quantity: "",
          unitPrice: "",
        }],
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", user?.stationId] });
    },
    onError: (error: any) => {
      console.error("Purchase order creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const updatePurchaseOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Calculate totals from line items (same as create)
      const subtotal = data.items.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')), 0
      );
      const taxAmount = 0; // No tax for now
      const totalAmount = subtotal + taxAmount;

      // Prepare line items with calculated totals
      const itemsWithTotals = data.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')).toString(),
      }));

      // Normalize dates to ISO timestamps
      const orderData = {
        orderNumber: data.orderNumber,
        stationId: user?.stationId,
        supplierId: data.supplierId,
        userId: user?.id,
        orderDate: new Date(data.orderDate).toISOString(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString() : null,
        status: data.status,
        currencyCode: currencyConfig.code,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        notes: data.notes || "",
      };

      const response = await apiRequest("PUT", `/api/purchase-orders/${id}`, { order: orderData, items: itemsWithTotals });
      if (!response.ok) throw new Error('Failed to update purchase order');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order updated",
        description: "Purchase order has been updated successfully",
      });
      setEditOrderId(null);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", user?.stationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  const deletePurchaseOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/purchase-orders/${id}`);
      if (!response.ok) throw new Error('Failed to delete purchase order');
    },
    onSuccess: () => {
      toast({
        title: "Purchase order deleted",
        description: "Purchase order has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", user?.stationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("Form submitted with data:", data);

    // Validate that all required fields are present
    if (!data.orderNumber || !data.supplierId || !data.orderDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate that at least one item exists with valid data
    if (!data.items || data.items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    // Validate each item
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.productId || !item.quantity || !item.unitPrice) {
        toast({
          title: "Validation Error",
          description: `Please complete all fields for item ${i + 1}`,
          variant: "destructive",
        });
        return;
      }

      // Convert to numbers and validate
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);

      if (isNaN(qty) || qty <= 0) {
        toast({
          title: "Validation Error",
          description: `Invalid quantity for item ${i + 1}`,
          variant: "destructive",
        });
        return;
      }

      if (isNaN(price) || price <= 0) {
        toast({
          title: "Validation Error",
          description: `Invalid unit price for item ${i + 1}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (editOrderId) {
      updatePurchaseOrderMutation.mutate({ id: editOrderId, data });
    } else {
      createPurchaseOrderMutation.mutate(data);
    }
  };

  const { data: purchaseOrders = [], isLoading: isLoadingPurchaseOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders", user?.stationId],
    enabled: !!user?.stationId,
    onSuccess: (data) => {
      setOrders(data);
      setFilteredOrders(data); // Initialize filteredOrders with all orders
    },
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleFilter = () => {
    let filtered = orders.filter((order: any) => {
      const matchesSearch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      let matchesDate = true;
      if (fromDate && toDate) {
        const orderDate = new Date(order.orderDate).toDateString();
        const from = new Date(fromDate).toDateString();
        const to = new Date(toDate).toDateString();
        matchesDate = orderDate >= from && orderDate <= to;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
    setFilteredOrders(filtered);
  };

  const handlePrintReport = () => {
    const reportData = filteredOrders.map((order: any) => ({
      'Order Number': order.orderNumber,
      'Supplier': order.supplier?.name || 'N/A',
      'Order Date': new Date(order.orderDate).toLocaleDateString(),
      'Expected Delivery': order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A',
      'Status': order.status,
      'Total Amount': formatCompactNumber(order.totalAmount)
    }));

    const dateRange = fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Records';

    printReport({
      title: 'Purchase Orders Report',
      subtitle: `Period: ${dateRange}`,
      data: reportData,
      summary: [
        { label: 'Total Orders', value: filteredOrders.length.toString() },
        { label: 'Total Value', value: formatCompactNumber(filteredOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || 0), 0)) }
      ]
    });
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, statusFilter, fromDate, toDate, orders]);

  const handleDeleteOrder = (order: PurchaseOrder) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = () => {
    if (orderToDelete) {
      deletePurchaseOrderMutation.mutate(orderToDelete.id);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    navigate(`/purchase-invoice/${order.id}`);
  };


  if (isLoadingPurchaseOrders) {
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

  const pendingOrders = filteredOrders.filter((o: PurchaseOrder) => o.status === 'pending').length;
  const deliveredOrders = filteredOrders.filter((o: PurchaseOrder) => o.status === 'delivered').length;
  const totalValue = filteredOrders.reduce((sum: number, o: PurchaseOrder) => sum + parseFloat(o.totalAmount || '0'), 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Purchase Orders</h3>
          <p className="text-muted-foreground">Manage fuel procurement and supplier orders</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => { 
          setOpen(isOpen);
          if (!isOpen) { 
            setEditOrderId(null); 
            form.reset({
              orderNumber: `PO-${Date.now()}`,
              supplierId: "",
              orderDate: new Date().toISOString().split('T')[0],
              expectedDeliveryDate: "",
              status: "pending",
              items: [{
                productId: "",
                quantity: "",
                unitPrice: "",
              }],
              notes: "",
            });
          } 
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editOrderId ? "Edit Purchase Order" : "Create New Purchase Order"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="PO-123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select supplier"
                            emptyMessage="No suppliers found"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Delivery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Line Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Order Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentItems = form.getValues("items");
                        form.setValue("items", [...currentItems, { productId: "", quantity: "", unitPrice: "" }]);
                      }}
                      data-testid="button-add-item"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {form.watch("items").map((_, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-4">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger data-testid={`select-product-${index}`}>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} - {formatCurrency(parseFloat(product.currentPrice))}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.001"
                                  placeholder="0"
                                  {...field}
                                  data-testid={`input-quantity-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  data-testid={`input-unitprice-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {formatCurrency(
                            (parseFloat(form.watch(`items.${index}.quantity`) || '0') * 
                             parseFloat(form.watch(`items.${index}.unitPrice`) || '0'))
                          )}
                        </div>
                        {form.watch("items").length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const currentItems = form.getValues("items");
                              form.setValue("items", currentItems.filter((_, i) => i !== index));
                            }}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Totals Display */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span data-testid="text-calculated-subtotal">
                        {formatCurrency(
                          form.watch("items").reduce((sum, item) => 
                            sum + (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')), 0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (0%):</span>
                      <span>
                        {formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span data-testid="text-calculated-total">
                        {formatCurrency(
                          form.watch("items").reduce((sum, item) => 
                            sum + (parseFloat(item.quantity || '0') * parseFloat(item.unitPrice || '0')), 0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Order details and special instructions" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { 
                      setOpen(false); 
                      setEditOrderId(null); 
                    }} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                  <Button type="submit" disabled={createPurchaseOrderMutation.isPending || updatePurchaseOrderMutation.isPending} className="w-full sm:w-auto">
                    {editOrderId ? "Update Purchase Order" : "Create Purchase Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Purchase Order Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-primary">
              {filteredOrders.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-orange-600">
              {pendingOrders}
            </div>
            <div className="text-sm text-muted-foreground">Pending Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {deliveredOrders}
            </div>
            <div className="text-sm text-muted-foreground">Delivered Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-purple-600">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Purchase Order History</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Input
                type="text"
                placeholder="Search orders or suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48"
              />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
                className="w-full sm:w-40"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
                className="w-full sm:w-40"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleFilter}>
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">PO Number</th>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-center p-3 font-medium">Order Date</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? filteredOrders.map((order: PurchaseOrder, index: number) => {
                  const supplier = suppliers.find(s => s.id === order.supplierId);

                  return (
                    <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <span className="font-medium text-primary">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="p-3">{supplier?.name || 'Unknown Supplier'}</td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(parseFloat(order.totalAmount || '0'))}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={order.status === 'delivered' ? 'default' :
                                  order.status === 'pending' ? 'secondary' : 'destructive'}
                          className={order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center space-x-1 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                            className="p-2 text-blue-600 hover:text-blue-800"
                            title="View invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditOrderId(order.id);
                              form.reset({
                                orderNumber: order.orderNumber || "",
                                supplierId: order.supplierId || "",
                                orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
                                status: order.status || "pending",
                                items: order.items || [{
                                  productId: "",
                                  quantity: "",
                                  unitPrice: "",
                                }],
                                notes: order.notes || "",
                              });
                            }}
                            className="p-2 text-green-600 hover:text-green-800"
                            title="Edit order"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <PrintActions
                            type="purchaseOrder"
                            id={order.id}
                            compact={true}
                            variant="outline"
                            size="sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2 text-red-600 hover:text-red-800"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No purchase orders found for the selected criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteOrder}
        title="Delete Purchase Order"
        description="Are you sure you want to delete this purchase order? This action cannot be undone and will remove all order data."
        itemName={orderToDelete?.orderNumber || "purchase order"}
        isLoading={deletePurchaseOrderMutation.isPending}
      />
    </div>
  );
}