import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Supplier, Payment } from "@shared/schema";
import { insertPaymentSchema } from "@shared/schema";
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
import { Calendar, Eye, CreditCard, FileText, History, Printer, Search, Plus, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { formatCompactNumber } from "@/lib/utils";
import { printReport } from "@/lib/printUtils";

export default function AccountsPayable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filteredPayables, setFilteredPayables] = useState([]);

  const form = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      paymentDate: insertPaymentSchema.shape.paymentDate.optional(),
    })),
    defaultValues: {
      supplierId: "",
      amount: "",
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      type: "payable",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const quickPaymentForm = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      paymentDate: insertPaymentSchema.shape.paymentDate.optional(),
    })),
    defaultValues: {
      supplierId: "",
      amount: "0",
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      type: "payable",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const paymentData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        currencyCode: currencyConfig.code,
      };
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Payment to supplier has been recorded successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createPaymentMutation.mutate(data);
  };

  const onQuickPaymentSubmit = (data: any) => {
    const paymentData = {
      ...data,
      supplierId: selectedSupplierForPayment?.id,
      stationId: user?.stationId,
      userId: user?.id,
    };
    createQuickPaymentMutation.mutate(paymentData);
  };

  const createQuickPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const paymentData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        currencyCode: currencyConfig.code,
      };
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Payment to supplier has been recorded successfully",
      });
      setQuickPaymentOpen(false);
      quickPaymentForm.reset();
      setSelectedSupplierForPayment(null);
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSupplierForView, setSelectedSupplierForView] = useState<Supplier | null>(null);

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplierForView(supplier);
    setViewDialogOpen(true);
  };

  const handleQuickPayment = (supplier: Supplier) => {
    setSelectedSupplierForPayment(supplier);
    quickPaymentForm.setValue('supplierId', supplier.id);
    quickPaymentForm.setValue('amount', supplier.outstandingAmount || '0');
    setQuickPaymentOpen(true);
  };

  const handleViewHistory = (supplier: Supplier) => {
    navigate(`/payment-history/${supplier.id}/supplier`);
  };

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    onSuccess: (fetchedPayments) => {
      setPayables(fetchedPayments);
      setFilteredPayables(fetchedPayments);
    },
  });

  const allPayees = suppliers.map(s => ({
    id: s.id,
    name: s.name,
    type: 'supplier' as const,
    outstandingAmount: s.outstandingAmount || '0'
  }));

  const handleFilter = () => {
    let filtered = payments.filter((payable: any) => {
      const matchesSearch = payable.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payable.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (fromDate && toDate) {
        const payableDate = new Date(payable.createdAt).toDateString();
        const from = new Date(fromDate).toDateString();
        const to = new Date(toDate).toDateString();
        matchesDate = payableDate >= from && payableDate <= to;
      }

      return matchesSearch && matchesDate;
    });
    setFilteredPayables(filtered);
  };

  const handlePrintReport = () => {
    const reportData = filteredPayables.map((payable: any) => ({
      'Supplier': payable.supplier?.name || 'N/A',
      'Invoice Number': payable.invoiceNumber || 'N/A',
      'Amount': formatCompactNumber(payable.amount),
      'Due Date': new Date(payable.dueDate).toLocaleDateString(),
      'Status': payable.status,
      'Created': new Date(payable.createdAt).toLocaleDateString()
    }));

    const dateRange = fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Records';

    printReport({
      title: 'Accounts Payable Report',
      subtitle: `Period: ${dateRange}`,
      data: reportData,
      summary: [
        { label: 'Total Records', value: filteredPayables.length.toString() },
        { label: 'Total Amount', value: formatCompactNumber(filteredPayables.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)) }
      ]
    });
  };

  useEffect(() => {
    setFilteredPayables(payments);
  }, [payments]);

  useEffect(() => {
    handleFilter();
  }, [searchTerm, fromDate, toDate, payments]);


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

  const totalPayable = filteredPayables.reduce((sum: number, s: Supplier) => sum + parseFloat(s.outstandingAmount || '0'), 0);
  const overduePayments = filteredPayables.filter((s: Supplier) => parseFloat(s.outstandingAmount || '0') > 100000).length;
  const currentPayments = filteredPayables.filter((s: Supplier) => {
    const outstanding = parseFloat(s.outstandingAmount || '0');
    return outstanding > 0 && outstanding <= 100000;
  }).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-col items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Accounts Payable</h3>
          <p className="text-muted-foreground">Manage supplier payments and outstanding balances</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                + Make Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Payment to Supplier</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={allPayees.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Transaction/Check number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment details" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPaymentMutation.isPending} className="w-full sm:w-auto">
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={quickPaymentOpen} onOpenChange={setQuickPaymentOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quick Payment - {selectedSupplierForPayment?.name}</DialogTitle>
              </DialogHeader>
              <Form {...quickPaymentForm}>
                <form onSubmit={quickPaymentForm.handleSubmit(onQuickPaymentSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={quickPaymentForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quickPaymentForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={quickPaymentForm.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Transaction/Check number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={quickPaymentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment details" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setQuickPaymentOpen(false)} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createQuickPaymentMutation.isPending} className="w-full sm:w-auto">
                      {createQuickPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Supplier Details</DialogTitle>
              </DialogHeader>
              {selectedSupplierForView && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contact Person</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.contactPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.contactEmail || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Terms</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.paymentTerms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Outstanding</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedSupplierForView.outstandingAmount || '0'))}</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            title="View Payment Schedule"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Payment Schedule
          </Button>
        </div>
      </div>

      {/* Payables Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-primary">
              {filteredSuppliers.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Suppliers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {formatCurrency(totalPayable)}
            </div>
            <div className="text-sm text-muted-foreground">Total Payable</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-orange-600">
              {currentPayments}
            </div>
            <div className="text-sm text-muted-foreground">Current Payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {overduePayments}
            </div>
            <div className="text-sm text-muted-foreground">Overdue Payments</div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Payables Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Supplier Payment Status</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search suppliers or invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
              />
              <Button variant="outline" onClick={handleFilter}>
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Payable
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Payment Terms</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayables.length > 0 ? filteredPayables.map((supplier: Supplier, index: number) => {
                  const outstanding = parseFloat(supplier.outstandingAmount || '0');
                  const isOverdue = outstanding > 100000;

                  return (
                    <tr key={supplier.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground">
                          {supplier.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Contact: {supplier.contactPerson || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">{supplier.paymentTerms || 'Net 30'}</td>
                      <td className="p-3 text-right">
                        <span className="font-semibold text-red-600">
                          {formatCurrency(outstanding)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={isOverdue ? 'destructive' : 'default'}
                          className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                        >
                          {isOverdue ? 'Overdue' : 'Current'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSupplier(supplier)}
                            className="p-2 text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPayment(supplier)}
                            className="p-2 text-green-600 hover:text-green-800"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(supplier)}
                            className="p-2 text-orange-600 hover:text-orange-800"
                            title="Payment History"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No supplier payment data found for the selected criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}