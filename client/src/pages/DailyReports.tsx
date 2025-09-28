import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatAmount } from "@/lib/currency";
import { formatCompactNumber } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  Receipt,
  Download,
  RefreshCw,
  PieChart,
  BarChart3,
  ShoppingCart,
  Users,
  Truck,
  Building,
  Wallet,
  Calculator
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { globalPrintDocument } from "@/lib/printUtils";

interface SalesByMethod {
  paymentMethod: string;
  totalAmount: string;
  count: number;
  currencyCode: string;
}

interface SalesByProduct {
  productName: string;
  quantity: string;
  totalAmount: string;
  currencyCode: string;
}

interface ExpensesByCategory {
  category: string;
  accountName?: string;
  totalAmount: string;
  currencyCode: string;
  count: number;
}

interface ReceivablesData {
  newCredits: string;
  paymentsReceived: string;
  outstandingBalance: string;
  currencyCode: string;
}

interface PayablesData {
  newPurchases: string;
  paymentsMade: string;
  outstandingBalance: string;
  currencyCode: string;
}

interface CashFlowData {
  openingCash: string;
  cashReceipts: string;
  cashPayments: string;
  closingCash: string;
  cardReceipts: string;
  bankDeposits: string;
  currencyCode: string;
}

interface TaxSummary {
  gstCollected: string;
  gstPaid: string;
  netGst: string;
  currencyCode: string;
}

interface DailyReportData {
  date: string;
  salesByMethod: SalesByMethod[];
  salesByProduct: SalesByProduct[];
  expenses: ExpensesByCategory[];
  receivables: ReceivablesData;
  payables: PayablesData;
  cashFlow: CashFlowData;
  taxSummary: TaxSummary;
}

export default function DailyReports() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: dailyReport, isLoading, refetch } = useQuery<DailyReportData>({
    queryKey: [`/api/reports/daily/${user?.stationId}?date=${format(selectedDate, 'yyyy-MM-dd')}`],
    enabled: !!user?.stationId,
    refetchInterval: 30000,
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!dailyReport) return;

    const csvContent = [
      [`Daily Report - ${format(selectedDate, 'PPP')}`],
      [''],
      ['SALES SUMMARY'],
      ['Payment Method', 'Amount', 'Currency', 'Count'],
      ...dailyReport.salesByMethod.map(item => [
        item.paymentMethod,
        item.totalAmount,
        item.currencyCode,
        item.count.toString()
      ]),
      [''],
      ['PRODUCT SALES'],
      ['Product', 'Quantity', 'Amount', 'Currency'],
      ...dailyReport.salesByProduct.map(item => [
        item.productName,
        item.quantity,
        item.totalAmount,
        item.currencyCode
      ]),
      [''],
      ['EXPENSES'],
      ['Category/Account', 'Amount', 'Currency', 'Count'],
      ...dailyReport.expenses.map(item => [
        item.accountName || item.category,
        item.totalAmount,
        item.currencyCode,
        item.count.toString()
      ]),
      [''],
      ['RECEIVABLES'],
      ['New Credits', dailyReport.receivables.newCredits],
      ['Payments Received', dailyReport.receivables.paymentsReceived],
      ['Outstanding Balance', dailyReport.receivables.outstandingBalance],
      [''],
      ['PAYABLES'],
      ['New Purchases', dailyReport.payables.newPurchases],
      ['Payments Made', dailyReport.payables.paymentsMade],
      ['Outstanding Balance', dailyReport.payables.outstandingBalance],
      [''],
      ['CASH FLOW'],
      ['Opening Cash', dailyReport.cashFlow.openingCash],
      ['Cash Receipts', dailyReport.cashFlow.cashReceipts],
      ['Cash Payments', dailyReport.cashFlow.cashPayments],
      ['Closing Cash', dailyReport.cashFlow.closingCash],
      ['Card Receipts', dailyReport.cashFlow.cardReceipts],
      ['Bank Deposits', dailyReport.cashFlow.bankDeposits]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    if (!dailyReport) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Report - ${format(selectedDate, 'PPP')}</title>
          <style>
            @media print { @page { margin: 0.75in; size: A4; } }
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .section { margin: 25px 0; page-break-inside: avoid; }
            .section h3 { background: #f5f5f5; padding: 10px; margin: 0 0 15px 0; border-left: 4px solid #2563eb; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f9fafb; font-weight: bold; }
            .amount { text-align: right; font-weight: bold; }
            .negative { color: #dc2626; }
            .positive { color: #16a34a; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .summary-card { border: 1px solid #ddd; padding: 15px; background: #fafafa; }
            .total-row { background-color: #f0f9ff; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DAILY OPERATIONS REPORT</h1>
            <h2>FuelFlow Management System</h2>
            <p><strong>Report Date:</strong> ${format(selectedDate, 'PPP')}</p>
            <p><strong>Generated:</strong> ${format(new Date(), 'PPP p')}</p>
          </div>

          <!-- Executive Summary -->
          <div class="section">
            <h3>Executive Summary</h3>
            <div class="summary-grid">
              <div class="summary-card">
                <strong>Total Sales</strong><br>
                <span class="amount positive">${formatCurrency(totalSales)}</span><br>
                <small>${totalTransactions} transactions</small>
              </div>
              <div class="summary-card">
                <strong>Total Expenses</strong><br>
                <span class="amount negative">${formatCurrency(totalExpenses)}</span><br>
                <small>Daily operational costs</small>
              </div>
              <div class="summary-card">
                <strong>Net Cash Flow</strong><br>
                <span class="amount ${netCashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netCashFlow))}</span><br>
                <small>${netCashFlow >= 0 ? 'Positive' : 'Negative'} flow</small>
              </div>
              <div class="summary-card">
                <strong>Average Transaction</strong><br>
                <span class="amount">${formatCurrency(totalTransactions > 0 ? totalSales / totalTransactions : 0)}</span><br>
                <small>Per transaction value</small>
              </div>
            </div>
          </div>

          <!-- Detailed Sales Analysis -->
          <div class="section">
            <h3>Sales Analysis by Payment Method</h3>
            <table>
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Transactions</th>
                  <th>Amount</th>
                  <th>Average</th>
                  <th>% of Total</th>
                  <th>Time Period</th>
                </tr>
              </thead>
              <tbody>
                ${dailyReport.salesByMethod.map(sale => {
                  const amount = parseFloat(sale.totalAmount || '0');
                  const count = sale.count || 0;
                  const average = count > 0 ? amount / count : 0;
                  const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
                  return `
                    <tr>
                      <td>${sale.paymentMethod.toUpperCase()}</td>
                      <td style="text-align: center;">${count}</td>
                      <td class="amount">${formatAmount(amount, sale.currencyCode as any)}</td>
                      <td class="amount">${formatAmount(average, sale.currencyCode as any)}</td>
                      <td style="text-align: center;">${percentage.toFixed(1)}%</td>
                      <td>${format(selectedDate, 'PPP')}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td>TOTAL</td>
                  <td style="text-align: center;">${totalTransactions}</td>
                  <td class="amount">${formatCurrency(totalSales)}</td>
                  <td class="amount">${formatCurrency(totalTransactions > 0 ? totalSales / totalTransactions : 0)}</td>
                  <td style="text-align: center;">100.0%</td>
                  <td>Full Day</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Product Sales Details -->
          <div class="section">
            <h3>Product Sales Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                  <th>% of Sales</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                ${dailyReport.salesByProduct.map(product => {
                  const amount = parseFloat(product.totalAmount || '0');
                  const quantity = parseFloat(product.quantity || '0');
                  const unitPrice = quantity > 0 ? amount / quantity : 0;
                  const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
                  return `
                    <tr>
                      <td><strong>${product.productName}</strong></td>
                      <td style="text-align: center;">${quantity.toFixed(3)} L</td>
                      <td class="amount">${formatAmount(unitPrice, product.currencyCode as any)}</td>
                      <td class="amount">${formatAmount(amount, product.currencyCode as any)}</td>
                      <td style="text-align: center;">${percentage.toFixed(1)}%</td>
                      <td>Fuel</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Cash Flow Analysis -->
          <div class="section">
            <h3>Cash Flow Statement</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Opening Cash Balance</td>
                  <td class="amount">${formatAmount(parseFloat(dailyReport.cashFlow.openingCash), dailyReport.cashFlow.currencyCode as any)}</td>
                  <td>Start of day balance</td>
                </tr>
                <tr>
                  <td>Cash Sales Receipts</td>
                  <td class="amount positive">+${formatAmount(parseFloat(dailyReport.cashFlow.cashReceipts), dailyReport.cashFlow.currencyCode as any)}</td>
                  <td>Cash payments received</td>
                </tr>
                <tr>
                  <td>Card Sales Receipts</td>
                  <td class="amount positive">+${formatAmount(parseFloat(dailyReport.cashFlow.cardReceipts), dailyReport.cashFlow.currencyCode as any)}</td>
                  <td>Card payments processed</td>
                </tr>
                <tr>
                  <td>Cash Payments Made</td>
                  <td class="amount negative">-${formatAmount(parseFloat(dailyReport.cashFlow.cashPayments), dailyReport.cashFlow.currencyCode as any)}</td>
                  <td>Cash expenses paid</td>
                </tr>
                <tr>
                  <td>Bank Deposits</td>
                  <td class="amount">-${formatAmount(parseFloat(dailyReport.cashFlow.bankDeposits), dailyReport.cashFlow.currencyCode as any)}</td>
                  <td>Cash deposited to bank</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Closing Cash Balance</strong></td>
                  <td class="amount"><strong>${formatAmount(parseFloat(dailyReport.cashFlow.closingCash), dailyReport.cashFlow.currencyCode as any)}</strong></td>
                  <td>End of day balance</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Receivables & Payables -->
          <div class="section">
            <h3>Accounts Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Account Type</th>
                  <th>New Transactions</th>
                  <th>Payments</th>
                  <th>Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Accounts Receivable</td>
                  <td class="amount">${formatAmount(parseFloat(dailyReport.receivables.newCredits), dailyReport.receivables.currencyCode as any)}</td>
                  <td class="amount positive">${formatAmount(parseFloat(dailyReport.receivables.paymentsReceived), dailyReport.receivables.currencyCode as any)}</td>
                  <td class="amount">${formatAmount(parseFloat(dailyReport.receivables.outstandingBalance), dailyReport.receivables.currencyCode as any)}</td>
                </tr>
                <tr>
                  <td>Accounts Payable</td>
                  <td class="amount">${formatAmount(parseFloat(dailyReport.payables.newPurchases), dailyReport.payables.currencyCode as any)}</td>
                  <td class="amount negative">${formatAmount(parseFloat(dailyReport.payables.paymentsMade), dailyReport.payables.currencyCode as any)}</td>
                  <td class="amount">${formatAmount(parseFloat(dailyReport.payables.outstandingBalance), dailyReport.payables.currencyCode as any)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Tax Summary -->
          <div class="section">
            <h3>Tax Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Tax Component</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>GST Collected (Sales)</td>
                  <td class="amount positive">${formatAmount(parseFloat(dailyReport.taxSummary.gstCollected), dailyReport.taxSummary.currencyCode as any)}</td>
                  <td>Collected</td>
                </tr>
                <tr>
                  <td>GST Paid (Purchases)</td>
                  <td class="amount negative">${formatAmount(parseFloat(dailyReport.taxSummary.gstPaid), dailyReport.taxSummary.currencyCode as any)}</td>
                  <td>Paid</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Net GST ${parseFloat(dailyReport.taxSummary.netGst || '0') >= 0 ? 'Payable' : 'Refundable'}</strong></td>
                  <td class="amount"><strong>${formatAmount(Math.abs(parseFloat(dailyReport.taxSummary.netGst)), dailyReport.taxSummary.currencyCode as any)}</strong></td>
                  <td>${parseFloat(dailyReport.taxSummary.netGst || '0') >= 0 ? 'Due to Government' : 'Refund Due'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
            <p>This report was generated automatically by FuelFlow Management System</p>
            <p>Generated on ${format(new Date(), 'PPP p')} | Report covers ${format(selectedDate, 'PPP')}</p>
            <p>All amounts are in ${dailyReport.salesByMethod[0]?.currencyCode || 'PKR'} unless otherwise specified</p>
          </div>
        </body>
      </html>
    `;

    globalPrintDocument(printContent, `Daily_Report_${format(selectedDate, 'yyyy-MM-dd')}`);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="w-5 h-5 text-green-500" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-blue-500" />;
      case 'credit':
        return <Receipt className="w-5 h-5 text-orange-500" />;
      case 'fleet':
        return <Truck className="w-5 h-5 text-purple-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const totalSales = dailyReport?.salesByMethod.reduce(
    (sum, item) => sum + parseFloat(item.totalAmount || '0'), 0
  ) || 0;

  const totalTransactions = dailyReport?.salesByMethod.reduce(
    (sum, item) => sum + (item.count || 0), 0
  ) || 0;

  const totalExpenses = dailyReport?.expenses.reduce(
    (sum, item) => sum + parseFloat(item.totalAmount || '0'), 0
  ) || 0;

  const netCashFlow = parseFloat(dailyReport?.cashFlow.closingCash || '0') -
                      parseFloat(dailyReport?.cashFlow.openingCash || '0');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Daily Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive daily operations summary for {format(selectedDate, 'PPP')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintReport}
            size="sm"
            disabled={!dailyReport}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            size="sm"
            disabled={!dailyReport}
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Report Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                data-testid="button-date-picker"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date() || date < new Date("2023-01-01")
                }
                initialFocus
                data-testid="calendar-picker"
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <div className="text-3xl font-bold text-green-600" data-testid="total-sales">
                  {formatCurrency(totalSales)}
                </div>
                <p className="text-sm text-muted-foreground">{totalTransactions} transactions</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <div className="text-3xl font-bold text-red-600" data-testid="total-expenses">
                  {formatCurrency(totalExpenses)}
                </div>
                <p className="text-sm text-muted-foreground">Daily operational costs</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
                <div className={`text-3xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(netCashFlow))}
                </div>
                <p className="text-sm text-muted-foreground">Cash in minus out</p>
              </div>
              <Calculator className={`w-8 h-8 ${netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                <div className="text-3xl font-bold text-blue-600" data-testid="avg-transaction">
                  {formatCurrency(totalTransactions > 0 ? totalSales / totalTransactions : 0)}
                </div>
                <p className="text-sm text-muted-foreground">Per transaction</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="payables">Payables</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="tax">Tax Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          {/* Detailed Sales Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Detailed Sales Summary - {format(selectedDate, 'PPP')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Payment Method</th>
                      <th className="text-right p-3 font-medium">Transactions</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-right p-3 font-medium">Average</th>
                      <th className="text-right p-3 font-medium">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport?.salesByMethod && dailyReport.salesByMethod.length > 0 ? (
                      dailyReport.salesByMethod.map((sale, index) => {
                        const amount = parseFloat(sale.totalAmount || '0');
                        const count = sale.count || 0;
                        const average = count > 0 ? amount / count : 0;
                        const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
                        
                        return (
                          <tr key={`${sale.paymentMethod}-${index}`} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon(sale.paymentMethod)}
                                <span className="font-medium capitalize">
                                  {sale.paymentMethod}
                                </span>
                                <Badge variant="outline">
                                  {sale.currencyCode}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3 text-right font-semibold">{count}</td>
                            <td className="p-3 text-right font-semibold text-green-600">
                              {formatAmount(amount, sale.currencyCode as any)}
                            </td>
                            <td className="p-3 text-right">
                              {formatAmount(average, sale.currencyCode as any)}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {percentage.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No sales data for {format(selectedDate, 'PPP')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-primary/5 font-semibold">
                    <tr>
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right">{totalTransactions}</td>
                      <td className="p-3 text-right text-primary">{formatCurrency(totalSales)}</td>
                      <td className="p-3 text-right">
                        {totalTransactions > 0 ? formatCurrency(totalSales / totalTransactions) : formatCurrency(0)}
                      </td>
                      <td className="p-3 text-right">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Product Sales Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Product Sales Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Product Name</th>
                      <th className="text-right p-3 font-medium">Quantity Sold</th>
                      <th className="text-right p-3 font-medium">Unit Price</th>
                      <th className="text-right p-3 font-medium">Total Amount</th>
                      <th className="text-right p-3 font-medium">% of Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport?.salesByProduct && dailyReport.salesByProduct.length > 0 ? (
                      dailyReport.salesByProduct.map((product, index) => {
                        const amount = parseFloat(product.totalAmount || '0');
                        const quantity = parseFloat(product.quantity || '0');
                        const unitPrice = quantity > 0 ? amount / quantity : 0;
                        const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
                        
                        return (
                          <tr key={`${product.productName}-${index}`} className="border-b border-border hover:bg-muted/50">
                            <td className="p-3 font-medium">{product.productName}</td>
                            <td className="p-3 text-right">{quantity.toFixed(3)} L</td>
                            <td className="p-3 text-right">
                              {formatAmount(unitPrice, product.currencyCode as any)}
                            </td>
                            <td className="p-3 text-right font-semibold text-green-600">
                              {formatAmount(amount, product.currencyCode as any)}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {percentage.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No product sales data for {format(selectedDate, 'PPP')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Expenses by Category/Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyReport?.expenses && dailyReport.expenses.length > 0 ? (
                dailyReport.expenses.map((expense, index) => {
                  const percentage = totalExpenses > 0 ? (parseFloat(expense.totalAmount || '0') / totalExpenses) * 100 : 0;
                  return (
                    <div key={`${expense.category}-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                          <div>
                            <span className="font-medium">
                              {expense.accountName || expense.category}
                            </span>
                            {expense.accountName && expense.accountName !== expense.category && (
                              <div className="text-sm text-muted-foreground">
                                {expense.category}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" data-testid={`expense-currency-${index}`}>
                            {expense.currencyCode}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600" data-testid={`expense-amount-${index}`}>
                            {formatAmount(parseFloat(expense.totalAmount || '0'), expense.currencyCode as any)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {expense.count} transactions
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                          data-testid={`expense-progress-${index}`}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {percentage.toFixed(1)}% of total expenses
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No expenses recorded for this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  New Credit Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dailyReport?.receivables ? formatAmount(parseFloat(dailyReport.receivables.newCredits), dailyReport.receivables.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">Credit extended today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Payments Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dailyReport?.receivables ? formatAmount(parseFloat(dailyReport.receivables.paymentsReceived), dailyReport.receivables.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">Customer payments collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dailyReport?.receivables ? formatAmount(parseFloat(dailyReport.receivables.outstandingBalance), dailyReport.receivables.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">Total receivables</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  New Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dailyReport?.payables ? formatAmount(parseFloat(dailyReport.payables.newPurchases), dailyReport.payables.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">Supplier orders today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payments Made
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dailyReport?.payables ? formatAmount(parseFloat(dailyReport.payables.paymentsMade), dailyReport.payables.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">Supplier payments made</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dailyReport?.payables ? formatAmount(parseFloat(dailyReport.payables.outstandingBalance), dailyReport.payables.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">Total payables</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Opening Cash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dailyReport?.cashFlow ? formatAmount(parseFloat(dailyReport.cashFlow.openingCash), dailyReport.cashFlow.currencyCode as any) : formatCurrency(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cash Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dailyReport?.cashFlow ? formatAmount(parseFloat(dailyReport.cashFlow.cashReceipts), dailyReport.cashFlow.currencyCode as any) : formatCurrency(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dailyReport?.cashFlow ? formatAmount(parseFloat(dailyReport.cashFlow.cashPayments), dailyReport.cashFlow.currencyCode as any) : formatCurrency(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Closing Cash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dailyReport?.cashFlow ? formatAmount(parseFloat(dailyReport.cashFlow.closingCash), dailyReport.cashFlow.currencyCode as any) : formatCurrency(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Card Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {dailyReport?.cashFlow ? formatAmount(parseFloat(dailyReport.cashFlow.cardReceipts), dailyReport.cashFlow.currencyCode as any) : formatCurrency(0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Bank Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {dailyReport?.cashFlow ? formatAmount(parseFloat(dailyReport.cashFlow.bankDeposits), dailyReport.cashFlow.currencyCode as any) : formatCurrency(0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">GST Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dailyReport?.taxSummary ? formatAmount(parseFloat(dailyReport.taxSummary.gstCollected), dailyReport.taxSummary.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">From sales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">GST Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dailyReport?.taxSummary ? formatAmount(parseFloat(dailyReport.taxSummary.gstPaid), dailyReport.taxSummary.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">On purchases</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Net GST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${parseFloat(dailyReport?.taxSummary?.netGst || '0') >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {dailyReport?.taxSummary ? formatAmount(parseFloat(dailyReport.taxSummary.netGst), dailyReport.taxSummary.currencyCode as any) : formatCurrency(0)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {parseFloat(dailyReport?.taxSummary?.netGst || '0') >= 0 ? 'Payable to govt' : 'Refund due'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* No Data State */}
      {(!dailyReport?.salesByMethod || dailyReport.salesByMethod.length === 0) &&
       (!dailyReport?.expenses || dailyReport.expenses.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">
              No sales or expense data found for {format(selectedDate, 'PPP')}.
            </p>
            <p className="text-sm text-muted-foreground">
              Try selecting a different date or check if transactions were recorded.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}