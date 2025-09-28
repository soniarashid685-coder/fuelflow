import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Customer } from "@shared/schema";
import { insertCustomerSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Eye, Edit, CreditCard, Trash2 } from "lucide-react";

import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { PrintActions } from "@/components/ui/print-actions";


export default function CustomerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currencyConfig } = useCurrency() || { currencyConfig: { symbol: '₹' } };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Helper function for currency formatting
  const formatCurrency = (amount: number): string => {
    if (!currencyConfig || !currencyConfig.symbol) {
      return `${amount.toLocaleString()}`;
    }
    return `${currencyConfig.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      type: "walk-in",
      contactPhone: "",
      contactEmail: "",
      address: "",
      gstNumber: "",
      creditLimit: "0",
      outstandingAmount: "0",
    },
  });

  // Payment form
  const paymentForm = useForm({
    resolver: zodResolver(z.object({
      amount: z.string().min(1, "Amount is required"),
      paymentMethod: z.enum(['cash', 'card']),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    })),
    defaultValues: {
      amount: "",
      paymentMethod: "cash" as const,
      referenceNumber: "",
      notes: "",
    },
  });

  const form = useForm({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      type: "walk-in" as const,
      contactPhone: "",
      contactEmail: "",
      address: "",
      gstNumber: "",
      creditLimit: "0",
      outstandingAmount: "0",
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/customers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully",
      });
      setEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Payment has been recorded successfully",
      });
      setPaymentDialogOpen(false);
      paymentForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer created",
        description: "New customer has been added successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiRequest("DELETE", `/api/customers/${customerId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer deleted",
        description: "Customer has been deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createCustomerMutation.mutate(data);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.reset({
      name: customer.name,
      type: customer.type,
      contactPhone: customer.contactPhone || "",
      contactEmail: customer.contactEmail || "",
      address: customer.address || "",
      gstNumber: customer.gstNumber || "",
      creditLimit: customer.creditLimit || "0",
      outstandingAmount: customer.outstandingAmount || "0",
    });
    setEditDialogOpen(true);
  };

  const handlePaymentCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    paymentForm.reset({
      amount: "",
      paymentMethod: "cash" as const,
      referenceNumber: "",
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const onEditSubmit = (data: any) => {
    if (!selectedCustomer) return;
    updateCustomerMutation.mutate({ id: selectedCustomer.id, data });
  };

  const onPaymentSubmit = (data: any) => {
    if (!selectedCustomer || !user) return;

    if (!user.id) {
      toast({
        title: "Error",
        description: "User authentication required to record payment",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      customerId: selectedCustomer.id,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      type: "receivable",
      stationId: user.stationId || "default-station",
      userId: user.id,
      currencyCode: "PKR", // This should ideally be dynamic based on user settings or context
    };
    recordPaymentMutation.mutate(paymentData);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contactPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || customer.type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const creditCustomers = customers.filter((c: Customer) => c.type === 'credit').length;
  const totalOutstanding = customers.reduce((sum: number, c: Customer) => sum + parseFloat(c.outstandingAmount || '0'), 0);
  const overdueAccounts = customers.filter((c: Customer) => parseFloat(c.outstandingAmount || '0') > 0).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Customer Account Management</h3>
          <p className="text-muted-foreground">Manage customer profiles, credit accounts, and payment history</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer">
              + Add New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-type">
                            <SelectValue placeholder="Select customer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="walk-in">Walk-in</SelectItem>
                          <SelectItem value="credit">Credit Customer</SelectItem>
                          <SelectItem value="fleet">Fleet Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address" {...field} data-testid="input-customer-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter GST number" {...field} data-testid="input-customer-gst" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit ({currencyConfig.symbol})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-customer-credit-limit" />
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
                  <Button type="submit" disabled={createCustomerMutation.isPending} data-testid="button-submit-customer">
                    {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-customers">{customers.length}</div>
            <div className="text-sm text-muted-foreground">Total Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="credit-customers">{creditCustomers}</div>
            <div className="text-sm text-muted-foreground">Credit Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="outstanding-total">{formatCurrency(totalOutstanding)}</div>
            <div className="text-sm text-muted-foreground">Outstanding Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="overdue-accounts">{overdueAccounts}</div>
            <div className="text-sm text-muted-foreground">Overdue Accounts</div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteCustomer}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone and will remove all customer data and transaction history."
        itemName={customerToDelete?.name || "customer"}
        isLoading={deleteCustomerMutation.isPending}
      />

      {/* Customer Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Accounts</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search-customers"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="select-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="credit">Credit Customers</SelectItem>
                  <SelectItem value="walk-in">Cash Customers</SelectItem>
                  <SelectItem value="fleet">Fleet Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">Credit Limit</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Transaction</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: Customer, index: number) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium text-card-foreground" data-testid={`customer-name-${index}`}>
                        {customer.name}
                      </div>
                      {customer.gstNumber && (
                        <div className="text-sm text-muted-foreground">GST: {customer.gstNumber}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={customer.type === 'credit' ? 'default' : 'secondary'}
                        data-testid={`customer-type-${index}`}
                      >
                        {customer.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right" data-testid={`credit-limit-${index}`}>
                      {customer.type === 'credit' ? formatCurrency(parseFloat(customer.creditLimit || '0')) : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`font-semibold ${parseFloat(customer.outstandingAmount || '0') > 0 ? 'text-red-600' : 'text-green-600'}`}
                        data-testid={`outstanding-${index}`}
                      >
                        {parseFloat(customer.outstandingAmount || '0') > 0
                          ? formatCurrency(parseFloat(customer.outstandingAmount || '0'))
                          : '-'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm">2 hours ago</td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={customer.isActive ? 'default' : 'destructive'}
                        className={customer.isActive ? 'bg-green-100 text-green-800' : ''}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCustomer(customer)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            data-testid={`button-view-customer-${index}`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <PrintActions
                            type="statement"
                            id={customer.id}
                            compact={true}
                            variant="outline"
                            size="sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                            data-testid={`button-edit-customer-${index}`}
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {customer.type === 'credit' && parseFloat(customer.outstandingAmount || '0') > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePaymentCustomer(customer)}
                              className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                              data-testid={`button-payment-customer-${index}`}
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`button-delete-customer-${index}`}
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.contactPhone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.contactEmail || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Address</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.address || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Credit Limit</label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedCustomer.creditLimit || '0'))}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Outstanding</label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedCustomer.outstandingAmount || '0'))}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} data-testid="input-edit-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-customer-type">
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in</SelectItem>
                        <SelectItem value="credit">Credit Customer</SelectItem>
                        <SelectItem value="fleet">Fleet Customer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} data-testid="input-edit-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} data-testid="input-edit-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address" {...field} data-testid="input-edit-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="gstNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter GST number" {...field} data-testid="input-edit-customer-gst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="creditLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit ({currencyConfig.symbol})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-edit-customer-credit-limit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomerMutation.isPending} data-testid="button-update-customer">
                  {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {selectedCustomer && (
              <p className="text-sm text-muted-foreground">
                Recording payment for {selectedCustomer.name} (Outstanding: {formatCurrency(parseFloat(selectedCustomer.outstandingAmount || '0'))})
              </p>
            )}
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Enter payment amount" {...field} data-testid="input-payment-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reference number (optional)" {...field} data-testid="input-reference-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Add any notes (optional)" {...field} data-testid="input-payment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} data-testid="button-cancel-payment">
                  Cancel
                </Button>
                <Button type="submit" disabled={recordPaymentMutation.isPending} data-testid="button-record-payment">
                  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}