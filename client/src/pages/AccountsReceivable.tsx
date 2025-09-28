import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Customer, Payment } from "@shared/schema";
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
import { Trash2, Smartphone, Receipt, BarChart3, Eye, CreditCard, FileText, TrendingUp, History } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountsReceivable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);

  const form = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      paymentDate: insertPaymentSchema.shape.paymentDate.optional(),
    })),
    defaultValues: {
      customerId: "",
      amount: "",
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      type: "receivable",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const quickPaymentForm = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      paymentDate: insertPaymentSchema.shape.paymentDate.optional(),
    })),
    defaultValues: {
      customerId: "",
      amount: "0",
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      type: "receivable",
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
        currencyCode: currencyConfig.code, // Add required field
      };
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Customer payment has been recorded successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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
      customerId: selectedCustomerForPayment?.id,
      stationId: user?.stationId,
      userId: user?.id,
    };
    createQuickPaymentMutation.mutate(paymentData);
  };

  const createQuickPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Process form data to ensure all required fields are present
      const paymentData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        currencyCode: currencyConfig.code, // Add required currency field
      };
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Customer payment has been recorded successfully",
      });
      setQuickPaymentOpen(false);
      quickPaymentForm.reset();
      setSelectedCustomerForPayment(null);
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<Customer | null>(null);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomerForView(customer);
    setViewDialogOpen(true);
  };

  const handleQuickPayment = (customer: Customer) => {
    setSelectedCustomerForPayment(customer);
    quickPaymentForm.setValue('customerId', customer.id);
    quickPaymentForm.setValue('amount', customer.outstandingAmount || '0');
    setQuickPaymentOpen(true);
  };

  const handleGenerateStatement = (customer: Customer) => {
    // Navigate to payment history page
    navigate(`/payment-history/${customer.id}/customer`);
  };

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const creditCustomers = customers.filter((c: Customer) => parseFloat(c.outstandingAmount || '0') > 0);

  const filteredCustomers = creditCustomers.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase());

    // Aging filter logic
    const outstanding = parseFloat(customer.outstandingAmount || '0');
    let matchesAging = true;
    if (agingFilter === "current") {
      matchesAging = outstanding <= 50000;
    } else if (agingFilter === "30-60") {
      matchesAging = outstanding > 50000 && outstanding <= 100000;
    } else if (agingFilter === "60-90") {
      matchesAging = outstanding > 100000 && outstanding <= 150000;
    } else if (agingFilter === "90+") {
      matchesAging = outstanding > 150000;
    }

    return matchesSearch && matchesAging;
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

  const totalOutstanding = filteredCustomers.reduce((sum: number, c: Customer) => sum + parseFloat(c.outstandingAmount || '0'), 0);
  const overdueAccounts = filteredCustomers.filter((c: Customer) => parseFloat(c.outstandingAmount || '0') > 50000).length;
  const currentAccounts = filteredCustomers.filter((c: Customer) => {
    const outstanding = parseFloat(c.outstandingAmount || '0');
    return outstanding > 0 && outstanding <= 50000;
  }).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Accounts Receivable</h3>
          <p className="text-muted-foreground">Track customer payments and outstanding balances</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-record-payment">
                + Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Customer Payment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={customers.filter(c => parseFloat(c.outstandingAmount || '0') > 0).map(c => ({ 
                              value: c.id, 
                              label: `${c.name} (${formatCurrency(parseFloat(c.outstandingAmount || '0'))} outstanding)` 
                            }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select customer"
                            emptyMessage="No customers with outstanding balance found"
                            data-testid="select-customer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-payment-amount" />
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
                              <SelectTrigger data-testid="select-payment-method">
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
                          <Input placeholder="Transaction/Check number" {...field} data-testid="input-reference-number" />
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
                          <Textarea placeholder="Payment details" {...field} data-testid="input-payment-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPaymentMutation.isPending} data-testid="button-submit-payment">
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Quick Payment Dialog */}
          <Dialog open={quickPaymentOpen} onOpenChange={setQuickPaymentOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quick Payment - {selectedCustomerForPayment?.name}</DialogTitle>
              </DialogHeader>
              <Form {...quickPaymentForm}>
                <form onSubmit={quickPaymentForm.handleSubmit(onQuickPaymentSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={quickPaymentForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-quick-payment-amount" />
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
                              <SelectTrigger data-testid="select-quick-payment-method">
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
                          <Input placeholder="Transaction/Check number" {...field} data-testid="input-quick-reference-number" />
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
                          <Textarea placeholder="Payment details" {...field} data-testid="input-quick-payment-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setQuickPaymentOpen(false)} data-testid="button-quick-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createQuickPaymentMutation.isPending} data-testid="button-quick-submit-payment">
                      {createQuickPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* View Customer Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
              </DialogHeader>
              {selectedCustomerForView && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <p className="text-sm text-muted-foreground">{selectedCustomerForView.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <p className="text-sm text-muted-foreground">{selectedCustomerForView.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <p className="text-sm text-muted-foreground">{selectedCustomerForView.contactPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{selectedCustomerForView.contactEmail || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <p className="text-sm text-muted-foreground">{selectedCustomerForView.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Credit Limit</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedCustomerForView.creditLimit || '0'))}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Outstanding</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedCustomerForView.outstandingAmount || '0'))}</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm" 
            className="p-2" 
            data-testid="button-aging-report" 
            title="View Aging Report"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Aging Report
          </Button>
        </div>
      </div>

      {/* Receivables Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-customers-ar">
              {filteredCustomers.length}
            </div>
            <div className="text-sm text-muted-foreground">Outstanding Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="total-outstanding">
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="current-accounts">
              {currentAccounts}
            </div>
            <div className="text-sm text-muted-foreground">Current (0-30 days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="overdue-accounts-ar">
              {overdueAccounts}
            </div>
            <div className="text-sm text-muted-foreground">Overdue ({'>'}30 days)</div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Outstanding Customer Balances</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-customers-ar"
              />
              <Select value={agingFilter} onValueChange={setAgingFilter}>
                <SelectTrigger className="w-40" data-testid="select-aging-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="current">Current (0-30)</SelectItem>
                  <SelectItem value="30-60">30-60 Days</SelectItem>
                  <SelectItem value="60-90">60-90 Days</SelectItem>
                  <SelectItem value="90+">90+ Days</SelectItem>
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
                  <th className="text-right p-3 font-medium">Credit Limit</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-right p-3 font-medium">Available Credit</th>
                  <th className="text-center p-3 font-medium">Days Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Payment</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? filteredCustomers.map((customer: Customer, index: number) => {
                  const creditLimit = parseFloat(customer.creditLimit || '0');
                  const outstanding = parseFloat(customer.outstandingAmount || '0');
                  const availableCredit = creditLimit - outstanding;
                  const isOverdue = outstanding > 50000;

                  return (
                    <tr key={customer.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground" data-testid={`customer-name-ar-${index}`}>
                          {customer.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          GST: {customer.gstNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(creditLimit)}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-semibold text-red-600" data-testid={`outstanding-ar-${index}`}>
                          {formatCurrency(outstanding)}
                        </span>
                      </td>
                      <td className="p-3 text-right text-green-600">
                        {formatCurrency(Math.max(0, availableCredit))}
                      </td>
                      <td className="p-3 text-center">
                        <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                          {isOverdue ? '30+' : '<30'} days
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={isOverdue ? 'destructive' : 'default'}
                          className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                          data-testid={`status-ar-${index}`}
                        >
                          {isOverdue ? 'Overdue' : 'Current'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCustomer(customer)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            data-testid="button-view-customer-receivable"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPayment(customer)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                            data-testid="button-quick-payment-receivable"
                            title="Collect Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateStatement(customer)}
                            className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                            data-testid="button-statement-receivable"
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
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No outstanding accounts found for the selected criteria
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