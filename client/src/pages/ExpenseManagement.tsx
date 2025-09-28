import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { CreditCard, Receipt, Eye, Edit, Trash2, Plus, Download, Printer, Filter, Calendar, ChevronRight, FolderTree } from "lucide-react";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { PrintActions } from "@/components/ui/print-actions";
import { generatePrintTemplate, globalPrintDocument } from "@/lib/printUtils";
import { Combobox } from "@/components/ui/combobox";
import { format } from "date-fns";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  accountId: z.string().min(1, "Account is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  expenseDate: z.string().min(1, "Date is required"),
  receiptNumber: z.string().optional(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
});

interface Expense {
  id: string;
  description: string;
  amount: string;
  category: string;
  accountId?: string;
  paymentMethod: string;
  expenseDate: string;
  receiptNumber?: string;
  vendorName?: string;
  notes?: string;
  stationId: string;
  userId: string;
  createdAt: string;
  account?: {
    id: string;
    code: string;
    name: string;
    type: string;
    parentAccountId?: string;
    parentAccount?: {
      name: string;
      code: string;
    };
  };
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  parentAccountId?: string;
  parentAccount?: {
    name: string;
    code: string;
  };
  childAccounts?: Account[];
}

export default function ExpenseManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [accountManagementOpen, setAccountManagementOpen] = useState(false);

  // Filtering states
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      accountId: "",
      paymentMethod: "",
      expenseDate: new Date().toISOString().split('T')[0],
      receiptNumber: "",
      vendorName: "",
      notes: "",
    },
    mode: "onChange"
  });

  const accountForm = useForm({
    resolver: zodResolver(z.object({
      code: z.string().min(1, "Account code is required"),
      name: z.string().min(1, "Account name is required"),
      type: z.literal("expense"),
      parentAccountId: z.string().optional(),
    })),
    defaultValues: {
      code: "",
      name: "",
      type: "expense" as const,
      parentAccountId: "",
    },
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", user?.stationId, selectedAccountFilter, dateFromFilter, dateToFilter],
    queryFn: () => {
      let url = `/api/expenses?stationId=${user?.stationId}`;
      if (selectedAccountFilter && selectedAccountFilter !== "all") {
        url += `&accountId=${selectedAccountFilter}`;
      }
      if (dateFromFilter) {
        url += `&dateFrom=${dateFromFilter}`;
      }
      if (dateToFilter) {
        url += `&dateTo=${dateToFilter}`;
      }
      return apiRequest("GET", url).then(res => res.json());
    },
    enabled: !!user?.stationId,
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts", user?.stationId],
    queryFn: () => apiRequest("GET", `/api/accounts?stationId=${user?.stationId}&type=expense`).then(res => res.json()),
    enabled: !!user?.stationId,
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const accountData = {
        ...data,
        stationId: user?.stationId,
        normalBalance: "debit",
        currencyCode: "PKR",
      };
      const response = await apiRequest("POST", "/api/accounts", accountData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "Expense account has been created successfully",
      });
      setAccountManagementOpen(false);
      accountForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/accounts", user?.stationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.stationId || !user?.id) {
        throw new Error("User session not properly loaded");
      }

      const expenseData = {
        description: data.description,
        amount: parseFloat(data.amount).toString(),
        accountId: data.accountId,
        paymentMethod: data.paymentMethod,
        expenseDate: data.expenseDate,
        receiptNumber: data.receiptNumber || "",
        vendorName: data.vendorName || "",
        notes: data.notes || "",
        stationId: user.stationId,
        userId: user.id,
        currencyCode: "PKR",
      };

      const response = await apiRequest("POST", "/api/expenses", expenseData);
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("Failed to parse success response:", parseError);
        throw new Error("Invalid response format from server");
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Expense recorded",
        description: "Expense has been recorded successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", user?.stationId] });
    },
    onError: (error: any) => {
      console.error("Expense creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const expenseData = {
        description: data.description,
        amount: parseFloat(data.amount).toString(),
        accountId: data.accountId,
        paymentMethod: data.paymentMethod,
        expenseDate: data.expenseDate,
        receiptNumber: data.receiptNumber || "",
        vendorName: data.vendorName || "",
        notes: data.notes || "",
        currencyCode: "PKR",
      };

      const response = await apiRequest("PUT", `/api/expenses/${id}`, expenseData);
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("Failed to parse success response:", parseError);
        throw new Error("Invalid response format from server");
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "Expense has been updated successfully",
      });
      setEditExpenseId(null);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", user?.stationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/expenses/${id}`);
      if (!response.ok) throw new Error('Failed to delete expense');
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "Expense has been deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setExpenseToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", user?.stationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (editExpenseId) {
      updateExpenseMutation.mutate({ id: editExpenseId, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const onAccountSubmit = (data: any) => {
    createAccountMutation.mutate(data);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpenseId(expense.id);
    form.reset({
      description: expense.description,
      amount: expense.amount,
      accountId: expense.accountId || "",
      paymentMethod: expense.paymentMethod,
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      receiptNumber: expense.receiptNumber || "",
      vendorName: expense.vendorName || "",
      notes: expense.notes || "",
    });
    setOpen(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteExpense = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete.id);
    }
  };

  const handlePrintReceipt = (expense: Expense) => {
    const template = generatePrintTemplate(expense, 'expense');
    globalPrintDocument(template);
  };

  const clearFilters = () => {
    setSelectedAccountFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    setVendorFilter("");
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Account', 'Amount', 'Payment Method', 'Vendor', 'Receipt #', 'Notes'],
      ...filteredExpenses.map(expense => [
        expense.expenseDate,
        expense.description,
        expense.account ? `${expense.account.code} - ${expense.account.name}` : expense.category,
        expense.amount,
        expense.paymentMethod.replace('_', ' '),
        expense.vendorName || '',
        expense.receiptNumber || '',
        expense.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Build hierarchical account options for display
  const buildAccountOptions = (accounts: Account[]) => {
    const parentAccounts = accounts.filter(acc => !acc.parentAccountId);
    const childAccounts = accounts.filter(acc => acc.parentAccountId);

    const options: { value: string; label: string }[] = [];

    parentAccounts.forEach(parent => {
      options.push({
        value: parent.id,
        label: `${parent.code} - ${parent.name}`
      });

      const children = childAccounts.filter(child => child.parentAccountId === parent.id);
      children.forEach(child => {
        options.push({
          value: child.id,
          label: `  └─ ${child.code} - ${child.name}`
        });
      });
    });

    return options;
  };

  // Filter expenses based on selected criteria
  const filteredExpenses = expenses.filter(expense => {
    if (vendorFilter && !expense.vendorName?.toLowerCase().includes(vendorFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group expenses by account for summary
  const expensesByAccount = filteredExpenses.reduce((acc, expense) => {
    const accountKey = expense.account ? `${expense.account.code} - ${expense.account.name}` : expense.category;
    if (!acc[accountKey]) {
      acc[accountKey] = { total: 0, count: 0 };
    }
    acc[accountKey].total += parseFloat(expense.amount);
    acc[accountKey].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  if (isLoading || accountsLoading) {
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

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const accountOptions = buildAccountOptions(accounts);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Expense Management</h3>
          <p className="text-muted-foreground">Track and manage business expenses with chart of accounts</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={accountManagementOpen} onOpenChange={setAccountManagementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderTree className="w-4 h-4 mr-2" />
                Manage Accounts
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Expense Account</DialogTitle>
              </DialogHeader>
              <Form {...accountForm}>
                <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={accountForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Code *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 5001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Office Rent" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={accountForm.control}
                    name="parentAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Account (Optional)</FormLabel>
                        <FormControl>
                          <Combobox
                            options={accountOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select parent account"
                            emptyMessage="No parent accounts found"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setAccountManagementOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAccountMutation.isPending}>
                      {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditExpenseId(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-expense">
                <Plus className="w-4 h-4 mr-2" />
                Record Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editExpenseId ? "Edit Expense" : "Record New Expense"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Input placeholder="Office supplies, fuel, etc." {...field} />
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
                          <FormLabel>Amount *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Account *</FormLabel>
                          <FormControl>
                            <Combobox
                              options={accountOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select account"
                              emptyMessage="No expense accounts found"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              max="9999-12-31"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Supplier/vendor name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="receiptNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional receipt reference" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}>
                      {editExpenseId ? "Update Expense" : "Record Expense"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expense Account</label>
              <Select value={selectedAccountFilter} onValueChange={setSelectedAccountFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accountOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <Input
                placeholder="Search vendor..."
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{filteredExpenses.length}</div>
            <div className="text-sm text-muted-foreground">Total Expenses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <div className="text-sm text-muted-foreground">Total Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {filteredExpenses.filter(e => new Date(e.expenseDate).getMonth() === new Date().getMonth()).length}
            </div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(expensesByAccount).length}
            </div>
            <div className="text-sm text-muted-foreground">Account Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Summary by Account */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Summary by Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(expensesByAccount).map(([account, data]) => (
              <div key={account} className="bg-muted/50 p-4 rounded-lg">
                <div className="font-medium text-sm">{account}</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(data.total)}</div>
                <div className="text-xs text-muted-foreground">{data.count} transactions</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-left p-3 font-medium">Account</th>
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Payment Method</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? filteredExpenses.map((expense, index) => (
                  <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3 text-sm">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-medium">{expense.description}</td>
                    <td className="p-3">
                      {expense.account ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {expense.account.code} - {expense.account.name}
                          </span>
                          {expense.account.parentAccount && (
                            <span className="text-xs text-muted-foreground">
                              Under: {expense.account.parentAccount.name}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">{expense.category}</Badge>
                      )}
                    </td>
                    <td className="p-3 text-sm">{expense.vendorName || '-'}</td>
                    <td className="p-3 text-right font-semibold text-red-600">
                      {formatCurrency(parseFloat(expense.amount))}
                    </td>
                    <td className="p-3 capitalize">{expense.paymentMethod.replace('_', ' ')}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintReceipt(expense)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditExpense(expense)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                          title="Edit Expense"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No expenses recorded yet
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
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        itemName={expenseToDelete?.description || "expense"}
        isLoading={deleteExpenseMutation.isPending}
      />
    </div>
  );
}