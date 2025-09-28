import { useState, useEffect } from "react";
import type { SalesTransaction, Customer, Product } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Eye, Edit, Trash2, Play, Download } from "lucide-react";
import { useLocation } from "wouter";

import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import { PrintActions } from "@/components/ui/print-actions";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { globalPrintDocument } from "@/lib/printUtils";
import { Printer, Filter } from "lucide-react";


interface DraftSale {
  id: string;
  selectedCustomerId: string;
  transactionItems: any[];
  paymentMethod: string;
  timestamp: number;
  totalAmount: number;
}

export default function SalesHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [filteredData, setFilteredData] = useState<SalesTransaction[]>([]);
  const [draftSales, setDraftSales] = useState<DraftSale[]>([]);
  const [showDrafts, setShowDrafts] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [draftDeleteConfirmOpen, setDraftDeleteConfirmOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  const handleViewTransaction = (transactionId: string) => {
    navigate(`/invoice/${transactionId}`);
  };

  const deleteSaleMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiRequest("DELETE", `/api/sales/${transactionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "Sales transaction has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDelete) {
      deleteSaleMutation.mutate(transactionToDelete);
      setDeleteConfirmOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleEditTransaction = (transactionId: string) => {
    // Navigate to invoice page for editing
    navigate(`/invoice/${transactionId}?edit=true`);
  };

  const handleContinueDraft = (draftId: string) => {
    // Navigate to Point of Sale to continue the draft
    navigate(`/pos?draft=${draftId}`);
  };

  const handleDeleteDraft = (draftId: string) => {
    setDraftToDelete(draftId);
    setDraftDeleteConfirmOpen(true);
  };

  const confirmDeleteDraft = () => {
    if (draftToDelete) {
      const updatedDrafts = draftSales.filter(draft => draft.id !== draftToDelete);
      setDraftSales(updatedDrafts);

      // Update localStorage
      if (updatedDrafts.length > 0) {
        localStorage.setItem('allPosDrafts', JSON.stringify(updatedDrafts));
      } else {
        localStorage.removeItem('allPosDrafts');
        localStorage.removeItem('posDraft'); // Also remove single draft
      }

      toast({
        title: "Draft deleted",
        description: "Draft sale has been removed",
      });

      setDraftDeleteConfirmOpen(false);
      setDraftToDelete(null);
    }
  };

  // Load drafts from localStorage
  useEffect(() => {
    const loadDrafts = () => {
      try {
        // Check for multiple drafts
        const allDrafts = localStorage.getItem('allPosDrafts');
        if (allDrafts) {
          const drafts = JSON.parse(allDrafts) as DraftSale[];
          setDraftSales(drafts);
          return;
        }

        // Check for single draft (legacy support)
        const singleDraft = localStorage.getItem('posDraft');
        if (singleDraft) {
          const draft = JSON.parse(singleDraft);
          const totalAmount = draft.transactionItems?.reduce((sum: number, item: any) => {
            return sum + (item.totalPrice || 0);
          }, 0) || 0;

          const draftSale: DraftSale = {
            id: `draft-${draft.timestamp || Date.now()}`,
            selectedCustomerId: draft.selectedCustomerId || '',
            transactionItems: draft.transactionItems || [],
            paymentMethod: draft.paymentMethod || 'cash',
            timestamp: draft.timestamp || Date.now(),
            totalAmount: totalAmount
          };

          setDraftSales([draftSale]);

          // Migrate to new format
          localStorage.setItem('allPosDrafts', JSON.stringify([draftSale]));
        }
      } catch (error) {
        console.error('Failed to load drafts:', error);
      }
    };

    loadDrafts();
  }, []);

  const exportToExcel = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Invoice,Customer,Amount,Payment Method,Date\n" +
      filteredSales.map(t => {
        const customer = customers.find(c => c.id === t.customerId);
        const date = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : 'N/A';
        return `${t.invoiceNumber},${customer?.name || 'Walk-in'},${t.totalAmount},${t.paymentMethod},${date}`;
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // Create a printable version of the sales data
    const printContent = `
      <html>
        <head>
          <title>Sales History Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sales History Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Date</th>
            </tr>
            ${filteredSales.map(t => {
              const customer = customers.find(c => c.id === t.customerId);
              const date = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : 'N/A';
              return `<tr>
                <td>${t.invoiceNumber}</td>
                <td>${customer?.name || 'Walk-in'}</td>
                <td>${formatCurrency(parseFloat(t.totalAmount || '0'))}</td>
                <td>${t.paymentMethod}</td>
                <td>${date}</td>
              </tr>`;
            }).join('')}
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const { data: salesTransactions = [], isLoading } = useQuery<SalesTransaction[]>({
    queryKey: ["/api/sales", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleApplyFilter = () => {
    let filtered = salesTransactions.filter((sale) => {
      const matchesSearch = 
        sale.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customers.find(c => c.id === sale.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        false;

      const matchesPaymentMethod = paymentFilter === "all" || sale.paymentMethod === paymentFilter;

      let matchesDate = true;
      if (fromDate && toDate) {
        const saleDate = new Date(sale.transactionDate || sale.createdAt);
        matchesDate = saleDate >= fromDate && saleDate <= toDate;
      } else if (dateFilter === "today") {
        const transactionToday = new Date(sale.transactionDate || sale.createdAt);
        transactionToday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        matchesDate = transactionToday.getTime() === today.getTime();
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date(new Date());
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const transactionToday = new Date(sale.transactionDate || sale.createdAt);
        transactionToday.setHours(0, 0, 0, 0);
        matchesDate = transactionToday.getTime() === yesterday.getTime();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(new Date());
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        const transactionDate = new Date(sale.transactionDate || sale.createdAt);
        transactionDate.setHours(0, 0, 0, 0);
        matchesDate = transactionDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(new Date());
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        const transactionDate = new Date(sale.transactionDate || sale.createdAt);
        transactionDate.setHours(0, 0, 0, 0);
        matchesDate = transactionDate >= monthAgo;
      }

      return matchesSearch && matchesPaymentMethod && matchesDate;
    });
    setFilteredData(filtered);
  };

  const handlePrintReport = () => {
    const dataToUse = filteredData.length > 0 ? filteredData : salesTransactions;
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Report</title>
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
            <h1>Sales Report</h1>
            <p>Generated on ${format(new Date(), 'PPP')}</p>
            ${fromDate && toDate ? `<p>Period: ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dataToUse.map(sale => `
                <tr>
                  <td>${format(new Date(sale.transactionDate || sale.createdAt), 'MMM dd, yyyy')}</td>
                  <td>${sale.invoiceNumber || 'N/A'}</td>
                  <td>${(customers.find(c => c.id === sale.customerId)?.name) || 'Walk-in'}</td>
                  <td>${sale.paymentMethod}</td>
                  <td class="amount">${formatCurrency(parseFloat(sale.totalAmount))}</td>
                  <td>${sale.status || 'Completed'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 30px;">
            <p><strong>Total Records: ${dataToUse.length}</strong></p>
            <p><strong>Total Amount: ${formatCurrency(dataToUse.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0))}</strong></p>
          </div>
        </body>
      </html>
    `;

    globalPrintDocument(printContent, `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const filteredSales = filteredData.length > 0 ? filteredData : salesTransactions.filter((transaction: SalesTransaction) => {
    // Enhanced search across multiple fields
    const customer = customers.find(c => c.id === transaction.customerId);
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = !searchTerm || 
      transaction.invoiceNumber?.toLowerCase().includes(searchLower) ||
      customer?.name?.toLowerCase().includes(searchLower) ||
      transaction.totalAmount?.includes(searchTerm) ||
      transaction.paymentMethod?.toLowerCase().includes(searchLower) ||
      transaction.subtotal?.includes(searchTerm) ||
      (customer?.contactPhone && customer.contactPhone.includes(searchTerm)) ||
      (customer?.gstNumber && customer.gstNumber.toLowerCase().includes(searchLower));
    const matchesPayment = paymentFilter === "all" || transaction.paymentMethod === paymentFilter;

    // Date filtering
    if (!transaction.transactionDate) return false;
    const transactionDate = new Date(transaction.transactionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchesDate = true;
    if (dateFilter === "today") {
      const transactionToday = new Date(transactionDate);
      transactionToday.setHours(0, 0, 0, 0);
      matchesDate = transactionToday.getTime() === today.getTime();
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const transactionToday = new Date(transactionDate);
      transactionToday.setHours(0, 0, 0, 0);
      matchesDate = transactionToday.getTime() === yesterday.getTime();
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = transactionDate >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = transactionDate >= monthAgo;
    }

    return matchesSearch && matchesPayment && matchesDate;
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

  const todaysSales = filteredSales.length;
  const totalAmount = filteredSales.reduce((sum: number, t: SalesTransaction) => sum + parseFloat(t.totalAmount || '0'), 0);
  const cashSales = filteredSales.filter((t: SalesTransaction) => t.paymentMethod === 'cash').length;
  const creditSales = filteredSales.filter((t: SalesTransaction) => t.paymentMethod === 'credit').length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Sales History</h3>
          <p className="text-muted-foreground">Complete transaction history and sales analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToExcel} data-testid="button-export-excel">
            <Download className="w-4 h-4 mr-2" />Export Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF} data-testid="button-export-pdf">
            📄 Export PDF
          </Button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="todays-transactions">
              {todaysSales}
            </div>
            <div className="text-sm text-muted-foreground">Today's Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="total-sales-amount">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600" data-testid="cash-transactions">
              {cashSales}
            </div>
            <div className="text-sm text-muted-foreground">Cash Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="credit-transactions">
              {creditSales}
            </div>
            <div className="text-sm text-muted-foreground">Credit Transactions</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <Input
                placeholder="Search by invoice, customer, amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search-transactions"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <DatePicker
                date={fromDate}
                onDateChange={setFromDate}
                placeholder="Select from date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <DatePicker
                date={toDate}
                onDateChange={setToDate}
                placeholder="Select to date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-32" data-testid="select-payment-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={handleApplyFilter} className="flex-1">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
            <div className="flex items-end">
              <Button onClick={handlePrintReport} variant="outline" className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32" data-testid="select-date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant={showDrafts ? "default" : "outline"}
                onClick={() => setShowDrafts(!showDrafts)}
                data-testid="button-toggle-drafts"
              >
                {showDrafts ? "Hide Drafts" : "Show Drafts"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">Invoice</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-right p-3 font-medium">Quantity</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-center p-3 font-medium">Payment</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Draft Sales */}
                {showDrafts && draftSales.map((draft: DraftSale, index: number) => {
                  const customer = customers.find(c => c.id === draft.selectedCustomerId);
                  const draftTime = new Date(draft.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={`draft-${draft.id}`} className="border-b border-border hover:bg-muted/50 bg-yellow-50 dark:bg-yellow-900/20">
                      <td className="p-3 text-sm">{draftTime}</td>
                      <td className="p-3">
                        <span className="font-medium text-yellow-600" data-testid={`draft-invoice-${index}`}>
                          DRAFT-{draft.id.split('-').pop()?.slice(-6)}
                        </span>
                      </td>
                      <td className="p-3">{customer?.name || 'Walk-in Customer'}</td>
                      <td className="p-3">{draft.transactionItems.length} items</td>
                      <td className="p-3 text-right">{draft.transactionItems.reduce((sum, item) => sum + (item.quantity || 0), 0).toFixed(1)}L</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right font-semibold" data-testid={`draft-amount-${index}`}>
                        {formatCurrency(draft.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                          DRAFT
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleContinueDraft(draft.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                            data-testid={`button-continue-draft-${index}`}
                            title="Continue Draft"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            data-testid={`button-delete-draft-${index}`}
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Completed Sales */}
                {filteredSales.length > 0 ? filteredSales.map((transaction: SalesTransaction & { items?: any[] }, index: number) => {
                  const customer = customers.find(c => c.id === transaction.customerId);
                  const transactionTime = transaction.transactionDate 
                    ? new Date(transaction.transactionDate).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';

                  return (
                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-sm">{transactionTime}</td>
                      <td className="p-3">
                        <span className="font-medium text-primary" data-testid={`invoice-${index}`}>
                          {transaction.invoiceNumber}
                        </span>
                      </td>
                      <td className="p-3">{customer?.name || 'Walk-in Customer'}</td>
                      <td className="p-3">
                        {transaction.items && transaction.items.length > 0 ? (
                          transaction.items.length === 1 
                            ? transaction.items[0].product?.name 
                            : `${transaction.items.length} items`
                        ) : 'No items'}
                      </td>
                      <td className="p-3 text-right">
                        {transaction.items && transaction.items.length > 0 
                          ? transaction.items.reduce((sum: number, item: any) => sum + parseFloat(item.quantity || '0'), 0).toFixed(1) + 'L'
                          : '-'
                        }
                      </td>
                      <td className="p-3 text-right">
                        {transaction.items && transaction.items.length === 1 
                          ? formatCurrency(parseFloat(transaction.items[0].unitPrice || '0'))
                          : '-'
                        }
                      </td>
                      <td className="p-3 text-right font-semibold" data-testid={`amount-${index}`}>
                        {formatCurrency(parseFloat(transaction.totalAmount || '0'))}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={transaction.paymentMethod === 'cash' ? 'default' : 
                                  transaction.paymentMethod === 'credit' ? 'destructive' : 'secondary'}
                          data-testid={`payment-method-${index}`}
                        >
                          {transaction.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTransaction(transaction.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            data-testid={`button-view-${index}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <PrintActions
                            type="invoice"
                            id={transaction.id}
                            compact={true}
                            variant="ghost"
                            size="sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            data-testid={`button-delete-${index}`}
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransaction(transaction.id)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            data-testid={`button-edit-${index}`}
                            title="Edit Transaction"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : null}

                {/* Show message when no data */}
                {filteredSales.length === 0 && (!showDrafts || draftSales.length === 0) && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      {showDrafts && draftSales.length === 0 
                        ? "No transactions or drafts found" 
                        : "No transactions found for the selected criteria"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Deletion Confirmation */}
      <DeleteConfirmation
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Sales Transaction"
        description="Are you sure you want to delete this sales transaction? This action cannot be undone and will permanently remove all transaction data."
        itemName="sales transaction"
        isLoading={deleteSaleMutation.isPending}
      />

      {/* Draft Deletion Confirmation */}
      <DeleteConfirmation
        isOpen={draftDeleteConfirmOpen}
        onClose={() => setDraftDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteDraft}
        title="Delete Draft Sale"
        description="Are you sure you want to delete this draft sale? This action cannot be undone."
        itemName="draft sale"
      />
    </div>
  );
}