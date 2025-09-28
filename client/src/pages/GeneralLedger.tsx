import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { format } from "date-fns";
import { Plus, Eye, Edit, Trash2, BookOpen, Calculator, Filter, Printer } from "lucide-react";
import { globalPrintDocument } from "@/lib/printUtils";

// Schema for account creation
const accountSchema = z.object({
  code: z.string().min(1, "Account code is required"),
  name: z.string().min(1, "Account name is required"),
  type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  normalBalance: z.enum(['debit', 'credit']),
  parentAccountId: z.string().optional(),
});

// Schema for journal entry
const journalEntrySchema = z.object({
  description: z.string().min(1, "Description is required"),
  entryDate: z.string().min(1, "Entry date is required"),
  sourceType: z.enum(['sale', 'purchase', 'expense', 'payment', 'adjustment']),
  lines: z.array(z.object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.string().default("0"),
    credit: z.string().default("0"),
    notes: z.string().optional(),
  })).min(2, "At least 2 journal lines required"),
});

export default function GeneralLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("accounts");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);

  const handleApplyFilter = () => {
    if (!fromDate || !toDate) {
      setFilteredEntries([]);
      return;
    }
    
    const filtered = journalEntries.filter((entry: any) => {
      const entryDate = new Date(entry.entryDate);
      return entryDate >= fromDate && entryDate <= toDate;
    });
    
    setFilteredEntries(filtered);
  };

  const handlePrintReport = () => {
    const dataToUse = filteredEntries.length > 0 ? filteredEntries : journalEntries;
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>General Ledger Report</title>
          <style>
            @page { margin: 1in; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .amount { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>General Ledger Report</h1>
            <p>Generated on ${format(new Date(), 'PPP')}</p>
            ${fromDate && toDate ? 
              `<p>Period: ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Entry #</th>
                <th>Date</th>
                <th>Description</th>
                <th>Source</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dataToUse.map((entry: any) => `
                <tr>
                  <td>${entry.entryNumber}</td>
                  <td>${format(new Date(entry.entryDate), 'MMM dd, yyyy')}</td>
                  <td>${entry.description}</td>
                  <td>${entry.sourceType}</td>
                  <td class="amount">${formatCurrency(parseFloat(entry.totalDebit || '0'))}</td>
                  <td class="amount">${formatCurrency(parseFloat(entry.totalCredit || '0'))}</td>
                  <td>${entry.isPosted ? 'Posted' : 'Draft'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    globalPrintDocument(printContent, `General_Ledger_Report_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const accountForm = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "expense" as const,
      normalBalance: "debit" as const,
      parentAccountId: "",
    },
  });

  const journalForm = useForm({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      description: "",
      entryDate: new Date().toISOString().split('T')[0],
      sourceType: "adjustment" as const,
      lines: [
        { accountId: "", debit: "0", credit: "0", notes: "" },
        { accountId: "", debit: "0", credit: "0", notes: "" },
      ],
    },
  });

  // Fetch accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["/api/accounts", user?.stationId],
    enabled: !!user?.stationId,
  });

  // Fetch journal entries
  const { data: journalEntries = [], isLoading: journalLoading } = useQuery({
    queryKey: ["/api/journal-entries", user?.stationId],
    enabled: !!user?.stationId,
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/accounts", {
        ...data,
        stationId: user?.stationId,
        normalBalance: data.type === 'asset' || data.type === 'expense' ? 'debit' : 'credit',
        isActive: true,
        isSystem: false,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created",
        description: "New account has been added to the chart of accounts",
      });
      setAccountDialogOpen(false);
      accountForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    },
  });

  // Create journal entry mutation
  const createJournalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/journal-entries", {
        ...data,
        stationId: user?.stationId,
        createdBy: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Journal entry created",
        description: "Journal entry has been posted to the ledger",
      });
      setJournalDialogOpen(false);
      journalForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create journal entry",
        variant: "destructive",
      });
    },
  });

  const onAccountSubmit = (data: any) => {
    createAccountMutation.mutate(data);
  };

  const onJournalSubmit = (data: any) => {
    // Validate that debits equal credits
    const totalDebits = data.lines.reduce((sum: number, line: any) => sum + parseFloat(line.debit || '0'), 0);
    const totalCredits = data.lines.reduce((sum: number, line: any) => sum + parseFloat(line.credit || '0'), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast({
        title: "Validation Error",
        description: "Total debits must equal total credits",
        variant: "destructive",
      });
      return;
    }

    // Validate that each line has either a debit or credit (but not both)
    const invalidLines = data.lines.filter((line: any) => {
      const debit = parseFloat(line.debit || '0');
      const credit = parseFloat(line.credit || '0');
      return (debit > 0 && credit > 0) || (debit === 0 && credit === 0);
    });

    if (invalidLines.length > 0) {
      toast({
        title: "Validation Error",
        description: "Each line must have either a debit or credit amount, but not both",
        variant: "destructive",
      });
      return;
    }

    // Validate that all lines have accounts selected
    const linesWithoutAccounts = data.lines.filter((line: any) => !line.accountId);
    if (linesWithoutAccounts.length > 0) {
      toast({
        title: "Validation Error",
        description: "All journal lines must have an account selected",
        variant: "destructive",
      });
      return;
    }

    createJournalMutation.mutate({
      ...data,
      totalDebit: totalDebits.toString(),
      totalCredit: totalCredits.toString(),
    });
  };

  const addJournalLine = () => {
    const currentLines = journalForm.getValues("lines");
    journalForm.setValue("lines", [
      ...currentLines,
      { accountId: "", debit: "0", credit: "0", notes: "" },
    ]);
  };

  const removeJournalLine = (index: number) => {
    const currentLines = journalForm.getValues("lines");
    if (currentLines.length > 2) {
      journalForm.setValue("lines", currentLines.filter((_, i) => i !== index));
    }
  };

  const getAccountBalance = (accountId: string) => {
    // This would typically calculate the running balance
    // For now, return a placeholder
    return Math.random() * 10000;
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (accountsLoading || journalLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">General Ledger</h3>
          <p className="text-muted-foreground">Manage chart of accounts and journal entries</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{accounts.length}</div>
            <div className="text-sm text-muted-foreground">Total Accounts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{journalEntries.length}</div>
            <div className="text-sm text-muted-foreground">Journal Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {accounts.filter((a: any) => a.type === 'asset').length}
            </div>
            <div className="text-sm text-muted-foreground">Asset Accounts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {accounts.filter((a: any) => a.type === 'expense').length}
            </div>
            <div className="text-sm text-muted-foreground">Expense Accounts</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
        </TabsList>

        {/* Chart of Accounts */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Chart of Accounts</h4>
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Account</DialogTitle>
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
                              <Input placeholder="e.g., 1001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={accountForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="asset">Asset</SelectItem>
                                <SelectItem value="liability">Liability</SelectItem>
                                <SelectItem value="equity">Equity</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={accountForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Cash in Hand" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="parentAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Account (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select parent account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts.map((account: any) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAccountDialogOpen(false)}
                      >
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
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Account Name</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account: any) => (
                      <tr key={account.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3 font-mono font-medium">{account.code}</td>
                        <td className="p-3">
                          <div className="font-medium">{account.name}</div>
                          {account.parentAccount && (
                            <div className="text-sm text-muted-foreground">
                              Parent: {account.parentAccount.name}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge className={getAccountTypeColor(account.type)}>
                            {account.type}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(getAccountBalance(account.id))}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={account.isActive ? 'default' : 'secondary'}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button variant="outline" size="sm" className="p-2">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="p-2">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!account.isSystem && (
                              <Button variant="outline" size="sm" className="p-2 text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Journal Entries</h4>
            <div className="flex items-center space-x-2">
              <DatePicker
                date={fromDate}
                onDateChange={setFromDate}
                placeholder="From date"
                className="w-40"
              />
              <DatePicker
                date={toDate}
                onDateChange={setToDate}
                placeholder="To date"
                className="w-40"
              />
              <Button onClick={handleApplyFilter} variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button onClick={handlePrintReport} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
            <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <BookOpen className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Journal Entry</DialogTitle>
                </DialogHeader>
                <Form {...journalForm}>
                  <form onSubmit={journalForm.handleSubmit(onJournalSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={journalForm.control}
                        name="entryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Entry Date *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={journalForm.control}
                        name="sourceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sale">Sale</SelectItem>
                                <SelectItem value="purchase">Purchase</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="payment">Payment</SelectItem>
                                <SelectItem value="adjustment">Adjustment</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={journalForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter journal entry description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Journal Lines */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Journal Lines</label>
                        <Button type="button" variant="outline" size="sm" onClick={addJournalLine}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Line
                        </Button>
                      </div>

                      {journalForm.watch("lines").map((_, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">Line {index + 1}</h5>
                            {journalForm.watch("lines").length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeJournalLine(index)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.accountId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {accounts.map((account: any) => (
                                        <SelectItem key={account.id} value={account.id}>
                                          {account.code} - {account.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.debit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Debit</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.credit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Credit</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={journalForm.control}
                              name={`lines.${index}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Optional notes" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Totals */}
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Total Debits</label>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(
                                journalForm.watch("lines").reduce(
                                  (sum, line) => sum + parseFloat(line.debit || '0'), 0
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Total Credits</label>
                            <div className="text-lg font-bold text-blue-600">
                              {formatCurrency(
                                journalForm.watch("lines").reduce(
                                  (sum, line) => sum + parseFloat(line.credit || '0'), 0
                                )
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="text-sm font-medium">Difference</label>
                          <div className={`text-lg font-bold ${
                            Math.abs(
                              journalForm.watch("lines").reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0) -
                              journalForm.watch("lines").reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0)
                            ) < 0.01 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Math.abs(
                              journalForm.watch("lines").reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0) -
                              journalForm.watch("lines").reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0)
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setJournalDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createJournalMutation.isPending}>
                        {createJournalMutation.isPending ? "Creating..." : "Create Entry"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Entry #</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Source</th>
                      <th className="text-right p-3 font-medium">Debit</th>
                      <th className="text-right p-3 font-medium">Credit</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredEntries.length > 0 ? filteredEntries : journalEntries).map((entry: any) => (
                      <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3 font-mono font-medium">{entry.entryNumber}</td>
                        <td className="p-3">{format(new Date(entry.entryDate), 'MMM dd, yyyy')}</td>
                        <td className="p-3">{entry.description}</td>
                        <td className="p-3">
                          <Badge variant="outline">{entry.sourceType}</Badge>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(parseFloat(entry.totalDebit || '0'))}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {formatCurrency(parseFloat(entry.totalCredit || '0'))}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={entry.isPosted ? 'default' : 'secondary'}>
                            {entry.isPosted ? 'Posted' : 'Draft'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button variant="outline" size="sm" className="p-2">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!entry.isPosted && (
                              <Button variant="outline" size="sm" className="p-2">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {journalEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No journal entries found. Create your first entry to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}