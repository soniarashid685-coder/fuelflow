import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Supplier } from "@shared/schema";
import { insertSupplierSchema } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Eye, Edit, Package, CreditCard, Trash2 } from "lucide-react";

import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { PrintActions } from "@/components/ui/print-actions";

export default function SupplierManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);


  // Edit form
  const editForm = useForm({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      gstNumber: "",
      paymentTerms: "Net 30 Days",
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
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      address: "",
      gstNumber: "",
      paymentTerms: "Net 30 Days",
      outstandingAmount: "0",
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/suppliers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier updated",
        description: "Supplier information has been updated successfully",
      });
      setEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
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
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
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

  const createSupplierMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier created",
        description: "New supplier has been added successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      const response = await apiRequest("DELETE", `/api/suppliers/${supplierId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier deleted",
        description: "Supplier has been deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setSupplierToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createSupplierMutation.mutate(data);
  };

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    editForm.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      contactPhone: supplier.contactPhone || "",
      contactEmail: supplier.contactEmail || "",
      address: supplier.address || "",
      gstNumber: supplier.gstNumber || "",
      paymentTerms: supplier.paymentTerms || "Net 30 Days",
      outstandingAmount: supplier.outstandingAmount || "0",
    });
    setEditDialogOpen(true);
  };

  const handlePaymentSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    paymentForm.reset({
      amount: "",
      paymentMethod: "cash" as const,
      referenceNumber: "",
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const onEditSubmit = (data: any) => {
    if (!selectedSupplier) return;
    updateSupplierMutation.mutate({ id: selectedSupplier.id, data });
  };

  const onPaymentSubmit = (data: any) => {
    if (!selectedSupplier || !user) return;

    if (!user.id) {
      toast({
        title: "Error",
        description: "User authentication required to record payment",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      supplierId: selectedSupplier.id,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      type: "payable",
      stationId: user.stationId || "default-station",
      userId: user.id,
      currencyCode: "PKR",
    };
    recordPaymentMutation.mutate(paymentData);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSupplier = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete.id);
    }
  };

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" ||
                         (filterStatus === "active" && supplier.isActive) ||
                         (filterStatus === "inactive" && !supplier.isActive);
    return matchesSearch && matchesStatus;
  });

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

  const activeSuppliers = suppliers.filter((s: Supplier) => s.isActive).length;
  const totalOutstanding = suppliers.reduce((sum: number, s: Supplier) => sum + parseFloat(s.outstandingAmount || '0'), 0);
  const suppliersWithOutstanding = suppliers.filter((s: Supplier) => parseFloat(s.outstandingAmount || '0') > 0).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Supplier Management</h3>
          <p className="text-muted-foreground">Manage vendor relationships and payment terms</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-supplier">
              + Add New Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter supplier name" {...field} data-testid="input-supplier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact person name" {...field} data-testid="input-contact-person" />
                      </FormControl>
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
                          <Input placeholder="Enter phone number" {...field} data-testid="input-supplier-phone" />
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
                          <Input type="email" placeholder="Enter email address" {...field} data-testid="input-supplier-email" />
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
                        <Input placeholder="Enter address" {...field} data-testid="input-supplier-address" />
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
                          <Input placeholder="Enter GST number" {...field} data-testid="input-supplier-gst" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Net 15 Days">Net 15 Days</SelectItem>
                            <SelectItem value="Net 30 Days">Net 30 Days</SelectItem>
                            <SelectItem value="Net 45 Days">Net 45 Days</SelectItem>
                            <SelectItem value="Net 60 Days">Net 60 Days</SelectItem>
                            <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSupplierMutation.isPending} data-testid="button-submit-supplier">
                    {createSupplierMutation.isPending ? "Creating..." : "Create Supplier"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Supplier Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Supplier Details</DialogTitle>
            </DialogHeader>
            {selectedSupplier && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Person</label>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.contactPerson || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.contactPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.contactEmail || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.address || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">GST Number</label>
                    <p className="text-sm text-muted-foreground">{selectedSupplier.gstNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Outstanding</label>
                    <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedSupplier.outstandingAmount || '0'))}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Record Payment to {selectedSupplier?.name}</DialogTitle>
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
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-supplier-payment-amount" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-supplier-payment-method">
                            <SelectValue placeholder="Select method" />
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
                        <Input placeholder="Transaction reference" {...field} data-testid="input-supplier-reference-number" />
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
                        <Input placeholder="Payment notes" {...field} data-testid="input-supplier-payment-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} data-testid="button-cancel-supplier-payment">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={recordPaymentMutation.isPending} data-testid="button-record-supplier-payment">
                    {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supplier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-suppliers">
              {suppliers.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Suppliers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="active-suppliers">
              {activeSuppliers}
            </div>
            <div className="text-sm text-muted-foreground">Active Suppliers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="total-outstanding-suppliers">
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="suppliers-with-outstanding">
              {suppliersWithOutstanding}
            </div>
            <div className="text-sm text-muted-foreground">Pending Payments</div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteSupplier}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone and will remove all supplier data and related records."
        itemName={supplierToDelete?.name || "supplier"}
        isLoading={deleteSupplierMutation.isPending}
      />

      {/* Supplier Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-suppliers"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
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
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Contact Person</th>
                  <th className="text-left p-3 font-medium">Payment Terms</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Order</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier: Supplier, index: number) => {
                  const outstanding = parseFloat(supplier.outstandingAmount || '0');

                  return (
                    <tr key={supplier.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground" data-testid={`supplier-name-${index}`}>
                          {supplier.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          GST: {supplier.gstNumber || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.contactEmail || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{supplier.contactPerson || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.contactPhone || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">{supplier.paymentTerms || 'Net 30 Days'}</td>
                      <td className="p-3 text-right">
                        {outstanding > 0 ? (
                          <span className="font-semibold text-red-600" data-testid={`outstanding-supplier-${index}`}>
                            {formatCurrency(outstanding)}
                          </span>
                        ) : (
                          <span className="text-green-600">{formatCurrency(0)}</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={supplier.isActive ? 'default' : 'secondary'}
                          className={supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          data-testid={`supplier-status-${index}`}
                        >
                          {supplier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSupplier(supplier)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            data-testid={`button-view-supplier-${index}`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <PrintActions
                            type="statement"
                            id={supplier.id}
                            compact={true}
                            variant="outline"
                            size="sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSupplier(supplier)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                            data-testid={`button-edit-supplier-${index}`}
                            title="Edit Supplier"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {parseFloat(supplier.outstandingAmount || '0') > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePaymentSupplier(supplier)}
                              className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                              data-testid={`button-payment-supplier-${index}`}
                              title="Record Payment"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSupplier(supplier)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                            data-testid={`button-delete-supplier-${index}`}
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No suppliers found for the selected criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Supplier Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier name" {...field} data-testid="input-edit-supplier-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person name" {...field} data-testid="input-edit-contact-person" />
                    </FormControl>
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
                        <Input placeholder="Enter phone number" {...field} data-testid="input-edit-supplier-phone" />
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
                        <Input type="email" placeholder="Enter email address" {...field} data-testid="input-edit-supplier-email" />
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
                      <Input placeholder="Enter address" {...field} data-testid="input-edit-supplier-address" />
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
                        <Input placeholder="Enter GST number" {...field} data-testid="input-edit-supplier-gst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-payment-terms">
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Net 15 Days">Net 15 Days</SelectItem>
                          <SelectItem value="Net 30 Days">Net 30 Days</SelectItem>
                          <SelectItem value="Net 45 Days">Net 45 Days</SelectItem>
                          <SelectItem value="Net 60 Days">Net 60 Days</SelectItem>
                          <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit-supplier">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSupplierMutation.isPending} data-testid="button-update-supplier">
                  {updateSupplierMutation.isPending ? "Updating..." : "Update Supplier"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}