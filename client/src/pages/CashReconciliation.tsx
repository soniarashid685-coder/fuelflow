import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SalesTransaction, Expense } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCompactNumber } from "@/lib/utils";
import { RefreshCw, CreditCard, TrendingUp, TrendingDown, Printer } from "lucide-react";
import { globalPrintDocument } from "@/lib/printUtils";

export default function CashReconciliation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [shift, setShift] = useState("day");
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);
  const [denominations, setDenominations] = useState([
    { value: 2000, count: 0, total: 0 },
    { value: 500, count: 0, total: 0 },
    { value: 200, count: 0, total: 0 },
    { value: 100, count: 0, total: 0 },
    { value: 50, count: 0, total: 0 },
    { value: 20, count: 0, total: 0 },
    { value: 10, count: 0, total: 0 },
    { value: 5, count: 0, total: 0 },
    { value: 2, count: 0, total: 0 },
    { value: 1, count: 0, total: 0 }
  ]);

  // Calculate shift time range
  const getShiftDateRange = () => {
    const baseDate = new Date(reconciliationDate);
    let startTime, endTime;

    if (shift === 'day') {
      startTime = new Date(baseDate);
      startTime.setHours(6, 0, 0, 0);
      endTime = new Date(baseDate);
      endTime.setHours(18, 0, 0, 0);
    } else if (shift === 'night') {
      startTime = new Date(baseDate);
      startTime.setHours(18, 0, 0, 0);
      endTime = new Date(baseDate);
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(6, 0, 0, 0);
    } else {
      startTime = new Date(baseDate);
      startTime.setHours(0, 0, 0, 0);
      endTime = new Date(baseDate);
      endTime.setHours(23, 59, 59, 999);
    }

    return { startTime: startTime.toISOString(), endTime: endTime.toISOString() };
  };

  const { startTime, endTime } = getShiftDateRange();

  // Fetch sales data for the selected shift
  const { data: salesTransactions = [], isLoading: salesLoading } = useQuery<SalesTransaction[]>({
    queryKey: ["/api/sales", user?.stationId, startTime, endTime],
    enabled: !!user?.stationId,
  });

  // Fetch expenses data for the selected shift  
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", user?.stationId, startTime, endTime],
    enabled: !!user?.stationId,
  });

  const isLoading = salesLoading || expensesLoading;

  // Calculate real cash data based on transactions
  const cashSales = salesTransactions
    .filter((t: SalesTransaction) => t.paymentMethod === 'cash')
    .reduce((sum: number, t: SalesTransaction) => sum + parseFloat(t.totalAmount || '0'), 0);

  const cardSales = salesTransactions
    .filter((t: SalesTransaction) => ['card', 'credit_card', 'debit_card'].includes(t.paymentMethod || ''))
    .reduce((sum: number, t: SalesTransaction) => sum + parseFloat(t.totalAmount || '0'), 0);

  const creditSales = salesTransactions
    .filter((t: SalesTransaction) => t.paymentMethod === 'credit')
    .reduce((sum: number, t: SalesTransaction) => sum + parseFloat(t.totalAmount || '0'), 0);

  const totalExpenses = expenses
    .reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0);

  const openingBalance = 5000; // This could be from previous day's closing or a settings table
  const expectedCash = openingBalance + cashSales - totalExpenses;
  const actualCash = denominations.reduce((sum, d) => sum + d.total, 0);
  const difference = actualCash - expectedCash;

  const cashData = {
    openingBalance,
    expectedCash,
    actualCash,
    difference,
    cashSales,
    cardSales,
    creditSales,
    expenses: totalExpenses
  };

  // Handle denomination count changes
  const updateDenomination = (index: number, count: number) => {
    const newDenominations = [...denominations];
    newDenominations[index].count = Math.max(0, count);
    newDenominations[index].total = newDenominations[index].value * newDenominations[index].count;
    setDenominations(newDenominations);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Cash Reconciliation</h3>
          <p className="text-muted-foreground">Daily cash balancing and shift-wise reporting</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => {
            toast({
              title: "Reconciliation Started",
              description: "Cash reconciliation process has been initiated",
            });
          }} data-testid="button-start-reconciliation">
            <RefreshCw className="mr-2 h-4 w-4" /> Start Reconciliation
          </Button>
          <Button variant="outline" onClick={() => {
            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Cash Reconciliation Report</title>
                  <style>
                    body { font-family: Arial, sans-serif; background: white; color: black; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                    .summary-item { padding: 15px; background: #f3f4f6; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #f5f5f5; }
                    .total { font-weight: bold; background: #e9e9e9; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1>Cash Reconciliation Report</h1>
                    <p>${shift.charAt(0).toUpperCase() + shift.slice(1)} Shift - ${new Date(reconciliationDate).toLocaleDateString()}</p>
                  </div>
                  <div class="summary">
                    <div class="summary-item">
                      <div>Opening Balance</div>
                      <div style="font-size: 20px; font-weight: bold;">${formatCurrency(cashData.openingBalance)}</div>
                    </div>
                    <div class="summary-item">
                      <div>Cash Sales</div>
                      <div style="font-size: 20px; font-weight: bold;">${formatCurrency(cashData.cashSales)}</div>
                    </div>
                    <div class="summary-item">
                      <div>Total Expenses</div>
                      <div style="font-size: 20px; font-weight: bold;">${formatCurrency(cashData.expenses)}</div>
                    </div>
                    <div class="summary-item">
                      <div>Expected Balance</div>
                      <div style="font-size: 20px; font-weight: bold;">${formatCurrency(cashData.expectedCash)}</div>
                    </div>
                  </div>
                  <div style="margin: 30px 0;">
                    <h3>Cash Count by Denomination</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Denomination</th>
                          <th>Count</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${denominations.map(denom => `
                          <tr>
                            <td>${formatCurrency(denom.value)}</td>
                            <td>${denom.count}</td>
                            <td>${formatCurrency(denom.total)}</td>
                          </tr>
                        `).join('')}
                        <tr class="total">
                          <td>Total Counted</td>
                          <td>-</td>
                          <td>${formatCurrency(cashData.actualCash)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style="margin: 30px 0; padding: 20px; background: ${cashData.difference === 0 ? '#d1fae5' : Math.abs(cashData.difference) <= 100 ? '#fef3c7' : '#fee2e2'}; border-radius: 8px;">
                    <h3>Reconciliation Summary</h3>
                    <p><strong>Expected Balance:</strong> ${formatCurrency(cashData.expectedCash)}</p>
                    <p><strong>Actual Balance:</strong> ${formatCurrency(cashData.actualCash)}</p>
                    <p><strong>Difference:</strong> ${formatCurrency(Math.abs(cashData.difference))} ${cashData.difference >= 0 ? 'Excess' : 'Shortage'}</p>
                  </div>
                </body>
              </html>
            `;

            globalPrintDocument(htmlContent, `Cash_Reconciliation_${shift}_${new Date(reconciliationDate).toISOString().split('T')[0]}`);
          }} data-testid="button-print-report">
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* Reconciliation Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Shift</label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger data-testid="select-shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift (6 AM - 6 PM)</SelectItem>
                  <SelectItem value="night">Night Shift (6 PM - 6 AM)</SelectItem>
                  <SelectItem value="full">Full Day (24 Hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Date</label>
              <Input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                data-testid="input-reconciliation-date"
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" data-testid="button-load-data">
                Load Shift Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="opening-balance">{formatCurrency(cashData.openingBalance)}</div>
              <div className="text-sm text-green-100">Opening Balance</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="expected-cash">{formatCurrency(cashData.expectedCash)}</div>
              <div className="text-sm text-blue-100">Expected Cash</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="actual-cash">{formatCurrency(cashData.actualCash)}</div>
              <div className="text-sm text-purple-100">Actual Cash</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="cash-difference">{formatCurrency(Math.abs(cashData.difference))}</div>
              <div className="text-sm text-red-100">
                {cashData.difference >= 0 ? 'Excess' : 'Shortage'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Counting */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Denomination Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {denominations.map((denom, index) => (
                <div key={denom.value} className="grid grid-cols-4 gap-4 items-center">
                  <label className="flex items-center space-x-2">
                        <span className="w-16 text-sm font-medium">{formatCurrency(denom.value)}</span></label>
                  <div className="text-center">×</div>
                  <Input
                    type="number"
                    value={denom.count}
                    onChange={(e) => updateDenomination(index, parseInt(e.target.value) || 0)}
                    className="text-center"
                    data-testid={`denom-count-${denom.value}`}
                  />
                  <div className="text-right font-semibold" data-testid={`denom-total-${denom.value}`}>
                    {formatCurrency(denom.total)}
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 mt-4">
                <div className="grid grid-cols-4 gap-4 font-bold">
                  <div>Total Cash:</div>
                  <div></div>
                  <div></div>
                  <div className="text-right text-lg" data-testid="total-counted-cash">
                    {formatCurrency(cashData.actualCash)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-md">
                <span className="font-medium">Cash Sales</span>
                <span className="text-lg font-bold text-green-600" data-testid="cash-sales">
                  {formatCurrency(cashData.cashSales)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                <span className="font-medium">Card Sales</span>
                <span className="text-lg font-bold text-blue-600" data-testid="card-sales">
                  {formatCurrency(cashData.cardSales)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-md">
                <span className="font-medium">Credit Sales</span>
                <span className="text-lg font-bold text-orange-600" data-testid="credit-sales">
                  {formatCurrency(cashData.creditSales)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-md">
                <span className="font-medium">Expenses Paid</span>
                <span className="text-lg font-bold text-red-600" data-testid="expenses-paid">
                  {formatCurrency(cashData.expenses)}
                </span>
              </div>

              <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Cash Movement:</span>
                  <span className="text-xl font-bold text-primary" data-testid="net-cash-movement">
                    {formatCurrency(cashData.cashSales - cashData.expenses)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-semibold text-lg">
                Cash Reconciliation - {shift.charAt(0).toUpperCase() + shift.slice(1)} Shift
              </div>
              <div className="text-sm text-muted-foreground">
                Date: {new Date(reconciliationDate).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={Math.abs(cashData.difference) <= 100 ? 'default' : 'destructive'}
                className={Math.abs(cashData.difference) <= 100 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                data-testid="reconciliation-status"
              >
                {Math.abs(cashData.difference) <= 100 ? 'Balanced' : 'Variance Detected'}
              </Badge>
              {cashData.difference !== 0 && (
                <div className={`mt-2 font-semibold ${cashData.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(cashData.difference))} {cashData.difference >= 0 ? 'Excess' : 'Shortage'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              localStorage.setItem('cashReconciliationDraft', JSON.stringify({
                shift,
                reconciliationDate,
                denominations,
                cashData
              }));
              toast({
                title: "Draft Saved",
                description: "Cash reconciliation draft has been saved locally",
              });
            }} data-testid="button-save-draft">
              Save Draft
            </Button>
            <Button onClick={() => {
              toast({
                title: "Reconciliation Completed",
                description: `Cash reconciliation for ${shift} shift completed successfully`,
              });
            }} data-testid="button-complete-reconciliation">
              Complete Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}