import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Plus, Trash2, Receipt, FileText, Calendar, User } from "lucide-react";
import type { Product, Customer, Supplier, Tank, SalesTransaction } from "@shared/schema";
import { generatePrintTemplate, globalPrintDocument } from "@/lib/printUtils";

interface CartItem {
  productId: string;
  product: Product;
  tankId?: string;
  tank?: Tank;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  paymentMethod: z.enum(["cash", "card", "credit"]),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

export default function PointOfSale() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [defaultQuantity, setDefaultQuantity] = useState<string>("25");
  const [transactionNumber] = useState(`TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: "",
      paymentMethod: "cash",
    },
  });

  // Fetch data
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  // Combine customers and suppliers for search
  const searchableOptions = [
    ...customers.map(c => ({ value: c.id, label: `${c.name} (Customer)`, type: 'customer' as const })),
    ...suppliers.map(s => ({ value: s.id, label: `${s.name} (Supplier)`, type: 'supplier' as const }))
  ];

  // Find walk-in customer and set as default
  const walkInCustomer = customers.find(c => c.type === 'walk-in') || customers[0];

  // Set default customer if form is empty
  useEffect(() => {
    if (walkInCustomer && !form.getValues('customerId')) {
      form.setValue('customerId', walkInCustomer.id);
    }
  }, [walkInCustomer, form]);

  // Get fuel products (Petrol, Diesel)
  const fuelProducts = products.filter(p => p.category === 'fuel');
  const otherProducts = products.filter(p => p.category !== 'fuel');

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = 0.00; // Tax removed as requested
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Add product to cart with default quantity
  const addToCart = (product: Product, tank?: Tank) => {
    const existingItemIndex = cart.findIndex(item => 
      item.productId === product.id && item.tankId === tank?.id
    );

    const quantity = parseFloat(defaultQuantity) || 1;

    if (existingItemIndex >= 0) {
      updateQuantity(existingItemIndex, cart[existingItemIndex].quantity + quantity);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        product,
        tankId: tank?.id,
        tank,
        quantity,
        unitPrice: parseFloat(product.currentPrice),
        totalPrice: parseFloat(product.currentPrice) * quantity,
      };
      setCart([...cart, newItem]);
    }
  };

  // Update quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    updatedCart[index].totalPrice = updatedCart[index].unitPrice * newQuantity;
    setCart(updatedCart);
  };

  // Update unit price
  const updateUnitPrice = (index: number, newPrice: number) => {
    const updatedCart = [...cart];
    updatedCart[index].unitPrice = newPrice;
    updatedCart[index].totalPrice = newPrice * updatedCart[index].quantity;
    setCart(updatedCart);
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    form.reset({
      customerId: walkInCustomer?.id || "",
      paymentMethod: "cash",
    });
  };

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create sale');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setLastTransaction(data);
      toast({
        title: "Sale completed",
        description: `Transaction completed successfully. Total: ${formatCurrency(totalAmount)}`,
      });
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tanks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: any) => {
      console.error('Sale creation error:', error);
      toast({
        title: "Sale failed",
        description: error.message || "Failed to complete sale",
        variant: "destructive",
      });
    },
  });

  // Submit sale
  const onSubmit = (data: SaleFormData) => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to cart before completing sale",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id || !user?.stationId) {
      toast({
        title: "Authentication error",
        description: "User session invalid. Please login again.",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      transaction: {
        stationId: user.stationId,
        customerId: data.customerId,
        userId: user.id,
        paymentMethod: data.paymentMethod,
        currencyCode: "PKR",
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: data.paymentMethod === "credit" ? "0" : totalAmount.toString(),
        outstandingAmount: data.paymentMethod === "credit" ? totalAmount.toString() : "0",
      },
      items: cart.map(item => ({
        productId: item.productId,
        tankId: item.tankId || null,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
    };

    createSaleMutation.mutate(saleData);
  };

  const saveAsDraft = () => {
    const draftData = {
      id: `draft-${Date.now()}`,
      selectedCustomerId: form.getValues('customerId'),
      transactionItems: cart,
      paymentMethod: form.getValues('paymentMethod'),
      timestamp: Date.now(),
      totalAmount: totalAmount,
    };

    // Get existing drafts
    const existingDrafts = JSON.parse(localStorage.getItem('allPosDrafts') || '[]');
    existingDrafts.push(draftData);
    localStorage.setItem('allPosDrafts', JSON.stringify(existingDrafts));

    toast({
      title: "Draft saved",
      description: "Transaction saved as draft",
    });
  };

  // Get available tanks for a product
  const getProductTanks = (productId: string) => {
    return tanks.filter(tank => tank.productId === productId && parseFloat(tank.currentStock || '0') > 0);
  };

  // --- New Functions for Adding Customer/Supplier and Handling Drafts/History ---

  const handleAddCustomerOrSupplier = (type: 'customer' | 'supplier', data: any) => {
    // Placeholder for adding new customer/supplier via modal or separate page
    console.log(`Adding new ${type}:`, data);
    // In a real app, this would involve a mutation to add the entity and then re-fetching or updating the list.
    // For now, we'll just show a toast.
    toast({
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Added`,
      description: `"${data.name}" has been added as a ${type}.`,
    });
    // Refetch customers/suppliers to update the combobox
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
  };

  const handleEditDraftOrHistory = (transactionId: string) => {
    // Placeholder for editing draft or transaction history
    console.log("Editing transaction:", transactionId);
    // Logic to fetch transaction data, populate the form and cart, and allow updates.
    // For now, just a toast.
    toast({
      title: "Editing Transaction",
      description: `Opening transaction ${transactionId} for editing.`,
    });
    // Example: if it's a draft, load from localStorage
    if (transactionId.startsWith('draft-')) {
      const drafts = JSON.parse(localStorage.getItem('allPosDrafts') || '[]');
      const draftToEdit = drafts.find((d: any) => d.id === transactionId);
      if (draftToEdit) {
        setCart(draftToEdit.transactionItems);
        form.reset({
          customerId: draftToEdit.selectedCustomerId,
          paymentMethod: draftToEdit.paymentMethod,
        });
        toast({ title: "Draft loaded", description: `Transaction ${transactionId} loaded into POS.`});
      } else {
        toast({ title: "Draft not found", description: `Draft ${transactionId} could not be loaded.`, variant: 'destructive'});
      }
    }
  };

  const handlePrint = (transaction: SalesTransaction) => {
    if (!transaction) {
      toast({ title: "No transaction to print", description: "Please complete a sale first.", variant: "destructive"});
      return;
    }
    console.log("Printing transaction:", transaction);
    const printContent = generatePrintTemplate(transaction, formatCurrency);
    globalPrintDocument(printContent);
  };

  // --- End New Functions ---

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Left Section - New Sale Transaction */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">New Sale Transaction</CardTitle>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Transaction #</p>
                <p className="text-lg font-bold text-primary">{transactionNumber}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Customer/Supplier</label>
              <div className="flex items-center gap-3">
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Combobox
                            options={searchableOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Search or select customer/supplier..."
                            emptyMessage="No customers/suppliers found"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
                {/* Button to add new customer/supplier */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // This should open a modal or navigate to a page to add a new customer/supplier
                    // For demonstration, we'll simulate adding a walk-in customer if none selected
                    if (!form.getValues('customerId')) {
                      toast({ title: "Please select a customer or supplier first.", variant: "destructive" });
                    } else {
                      // Logic to open modal for adding new customer/supplier, passing the type
                      // For example, if the selected customer is a walk-in, prompt to add a new one
                      const selectedCustomer = customers.find(c => c.id === form.getValues('customerId'));
                      if (selectedCustomer?.type === 'walk-in') {
                        // Call a function to open a modal for adding a new customer
                        // handleAddCustomerOrSupplier('customer', { name: 'New Customer', type: 'regular' }); 
                        console.log("Simulating add new customer modal");
                        toast({ title: "Add New Customer/Supplier", description: "A modal would open here." });
                      } else {
                        // If a valid customer/supplier is selected, potentially allow adding related entities
                        console.log("Simulating add new related entity");
                        toast({ title: "Add New Customer/Supplier", description: "A modal would open here." });
                      }
                    }
                  }}
                >
                  + Add
                </Button>
              </div>
            </div>

            {/* Default Quantity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Default Quantity (L)</label>
              <Input
                value={defaultQuantity}
                onChange={(e) => setDefaultQuantity(e.target.value)}
                className="w-32"
                type="number"
                step="0.1"
              />
            </div>

            {/* Fuel Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fuelProducts.map((product) => {
                const productTanks = getProductTanks(product.id);
                return (
                  <Card 
                    key={product.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => productTanks.length > 0 ? addToCart(product, productTanks[0]) : addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg text-primary">
                          {product.name}
                        </h3>
                        <span className="text-sm text-muted-foreground">{product.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">
                          {formatCurrency(parseFloat(product.currentPrice))}
                        </span>
                        <span className="text-sm text-muted-foreground">per litre</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Other Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherProducts.map((product) => (
                <Card 
                  key={product.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        {product.name}
                      </h3>
                      <span className="text-sm text-muted-foreground">{product.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">
                        {formatCurrency(parseFloat(product.currentPrice))}
                      </span>
                      <span className="text-sm text-muted-foreground">per {product.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart Items Table */}
            {cart.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Product</th>
                          <th className="text-center p-3 font-medium">Qty (L)</th>
                          <th className="text-center p-3 font-medium">Rate</th>
                          <th className="text-center p-3 font-medium">Amount</th>
                          <th className="text-center p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, index) => (
                          <tr key={`${item.productId}-${item.tankId || 'no-tank'}`} className="border-t">
                            <td className="p-3">{item.product.name}</td>
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                                step="0.1"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateUnitPrice(index, parseFloat(e.target.value) || 0)}
                                className="w-24 text-center"
                                step="0.01"
                              />
                            </td>
                            <td className="p-3 text-center font-medium">
                              {formatCurrency(item.totalPrice)}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {cart.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No items added. Click on a product above to add it.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Method Selection */}
            <div className="flex gap-4">
              <Button
                variant={form.watch('paymentMethod') === 'cash' ? 'default' : 'outline'}
                onClick={() => form.setValue('paymentMethod', 'cash')}
                className="flex-1"
              >
                Cash Payment
              </Button>
              <Button
                variant={form.watch('paymentMethod') === 'card' ? 'default' : 'outline'}
                onClick={() => form.setValue('paymentMethod', 'card')}
                className="flex-1"
              >
                Card Payment
              </Button>
              <Button
                variant={form.watch('paymentMethod') === 'credit' ? 'default' : 'outline'}
                onClick={() => form.setValue('paymentMethod', 'credit')}
                className="flex-1"
              >
                Credit Sale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Section - Transaction Summary */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {/* Tax is removed, so this section can be omitted or shown as 0 */}
            {taxAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (0%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={cart.length === 0 || createSaleMutation.isPending || !form.watch('customerId')}
                className="w-full h-12 text-lg"
              >
                {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
              </Button>
              <Button
                onClick={saveAsDraft}
                variant="outline"
                disabled={cart.length === 0}
                className="w-full"
              >
                Save as Draft
              </Button>
              <Button
                onClick={clearCart}
                variant="outline"
                className="w-full"
              >
                Cancel Transaction
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Last Transaction - Opens Transaction/Invoice page for the latest transaction */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                // Logic to find and open the latest transaction/invoice page
                // For now, navigating to sales-history which might list transactions
                toast({ title: "Navigate to Latest Transaction", description: "Opening sales history for latest transaction." });
                window.location.href = '/sales-history'; 
              }}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Last Transaction
            </Button>
            {/* Print Transaction - Uses global print functionality */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                handlePrint(lastTransaction);
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/daily-reports'}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Day Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}