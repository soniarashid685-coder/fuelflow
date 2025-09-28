import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Tank, SalesTransaction, Customer, Product } from "@shared/schema";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLocation } from "wouter";
import { Download, FileText, ShoppingCart, Users, BarChart3, AlertCircle, DollarSign, TrendingUp, Fuel, Clock, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCompactNumber } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency, formatCurrencyCompact } = useCurrency();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: tanks = [], isLoading: tanksLoading } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: recentSales = [], isLoading: salesLoading } = useQuery<SalesTransaction[]>({
    queryKey: ["/api/sales", user?.stationId, "recent"],
    enabled: !!user?.stationId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Calculate chart data from dashboard stats (last 7 days)
  const generateChartData = () => {
    if (!dashboardStats || typeof dashboardStats !== 'object' || !('weeklySales' in dashboardStats)) return [];

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const chartData = [];

    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      const dayData = (dashboardStats as any).weeklySales?.find((d: any) => d.dayOfWeek === dayIndex);
      chartData.push({
        day: days[dayIndex],
        sales: dayData ? parseFloat(dayData.totalAmount || '0') : 0
      });
    }
    return chartData;
  };

  // Calculate stock value from tanks
  const calculateStockValue = () => {
    if (!tanks.length || !products.length) return 0;

    return tanks.reduce((total, tank) => {
      const product = products.find(p => p.id === tank.productId);
      if (product) {
        const stockValue = parseFloat(tank.currentStock || '0') * parseFloat(product.currentPrice || '0');
        return total + stockValue;
      }
      return total;
    }, 0);
  };

  // Get overdue customers count
  const getOverdueCustomersCount = () => {
    return customers.filter((customer: Customer) => 
      parseFloat(customer.outstandingAmount || '0') > 0
    ).length;
  };

  // Quick action handlers
  const handleNewSale = () => {
    setLocation('/pos');
  };

  const handleViewReports = () => {
    setLocation('/financial-reports');
  };

  const handleStockStatus = () => {
    setLocation('/stock');
  };

  const handleCustomerPayments = () => {
    setLocation('/accounts-receivable');
  };

  const handleTankMonitoring = () => {
    setLocation('/tanks');
  };

  const handleDailyReports = () => {
    setLocation('/daily-reports');
  };


  const isLoading = statsLoading || tanksLoading || salesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-green-100 text-xs sm:text-sm font-medium">Today's Sales</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" data-testid="todays-sales">
                  {formatCurrencyCompact(parseFloat((dashboardStats as any)?.todaysSales?.totalAmount || '0'))}
                </p>
                <p className="text-green-100 text-xs sm:text-sm">{(dashboardStats as any)?.todaysSales?.count || 0} transactions</p>
              </div>
              <div className="opacity-80 flex-shrink-0"><DollarSign className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" /></div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center">
              <span className="text-green-100 text-xs">+12% vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs sm:text-sm font-medium">Monthly Revenue</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" data-testid="monthly-revenue">
                  {formatCurrencyCompact((dashboardStats as any)?.monthlySales?.totalAmount ? parseFloat((dashboardStats as any).monthlySales.totalAmount) : 0)}
                </p>
                <p className="text-blue-100 text-xs sm:text-sm">{(dashboardStats as any)?.monthlySales?.count || 0} transactions total</p>
              </div>
              <div className="opacity-80 flex-shrink-0"><TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" /></div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center">
              <span className="text-blue-100 text-xs">On track for target</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-purple-100 text-xs sm:text-sm font-medium">Stock Value</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" data-testid="stock-value">
                  {formatCurrencyCompact(calculateStockValue())}
                </p>
                <p className="text-purple-100 text-xs sm:text-sm">All tanks combined</p>
              </div>
              <div className="opacity-80 flex-shrink-0"><Fuel className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" /></div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center">
              <span className="text-purple-100 text-xs">3 days avg inventory</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-orange-100 text-xs sm:text-sm font-medium">Outstanding</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold truncate" data-testid="outstanding-amount">
                  {formatCurrencyCompact((dashboardStats as any)?.outstanding?.totalOutstanding ? parseFloat((dashboardStats as any).outstanding.totalOutstanding) : 0)}
                </p>
                <p className="text-orange-100 text-xs sm:text-sm">Credit customers</p>
              </div>
              <div className="opacity-80 flex-shrink-0"><Clock className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" /></div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center">
              <span className="text-orange-100 text-xs">{getOverdueCustomersCount()} customers pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-20"
              onClick={handleNewSale}
              data-testid="button-new-sale"
            >
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">New Sale</span>
            </Button>

            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-20"
              onClick={handleViewReports}
              data-testid="button-view-reports"
            >
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">View Reports</span>
            </Button>

            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-20"
              onClick={handleStockStatus}
              data-testid="button-stock-status"
            >
              <FileText className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium">Stock Status</span>
            </Button>

            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-20"
              onClick={handleCustomerPayments}
              data-testid="button-customer-payments"
            >
              <Users className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium">Customer Payments</span>
            </Button>

            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-20"
              onClick={handleTankMonitoring}
              data-testid="button-tank-monitoring"
            >
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="text-sm font-medium">Tank Monitoring</span>
            </Button>

            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-20"
              onClick={handleDailyReports}
              data-testid="button-daily-reports"
            >
              <Download className="w-6 h-6 text-indigo-600" />
              <span className="text-sm font-medium">Daily Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateChartData()}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Product Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(dashboardStats as any)?.productSales?.map((product: any, index: number) => {
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500'];
                return (
                  <div key={product.productId} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 ${colors[index % colors.length]} rounded mr-3`}></div>
                      <span className="font-medium">{product.productName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" data-testid={`${product.productName.toLowerCase()}-sales`}>
                        {formatCurrency(parseFloat(product.totalAmount || '0'))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {parseFloat(product.totalQuantity || '0').toLocaleString()} L
                      </div>
                    </div>
                  </div>
                );
              }) || (
                <div className="text-center text-muted-foreground py-4">
                  No product sales data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <button 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors" 
                onClick={() => setLocation('/sales-history')}
                data-testid="button-view-all"
              >
                View All
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.length > 0 ? recentSales.slice(0, 3).map((transaction: SalesTransaction, index: number) => {
                const timeAgo = transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleString() : 'N/A';
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                    <div>
                      <div className="font-medium text-card-foreground" data-testid={`transaction-id-${index}`}>
                        {transaction.invoiceNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.paymentMethod === 'cash' ? 'Cash Sale' : transaction.paymentMethod === 'credit' ? 'Credit Sale' : 'Card Sale'}
                      </div>
                      <div className="text-xs text-muted-foreground">{timeAgo}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        transaction.paymentMethod === 'cash' ? 'text-green-600' : 
                        transaction.paymentMethod === 'credit' ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        {formatCurrency(parseFloat(transaction.totalAmount || '0'))}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center text-muted-foreground py-4">
                  No recent transactions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Low Stock Alerts */}
              {tanks.filter(tank => {
                const currentStock = parseFloat(tank.currentStock || '0');
                const minimumLevel = parseFloat(tank.minimumLevel || '500');
                return currentStock <= minimumLevel;
              }).slice(0, 2).map(tank => {
                const product = products.find(p => p.id === tank.productId);
                return (
                  <div key={tank.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-yellow-800">Low Stock Alert</div>
                        <div className="text-xs text-yellow-600">
                          {tank.name} ({product?.name}) - Only {parseFloat(tank.currentStock || '0').toLocaleString()}L remaining
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Overdue Customers */}
              {customers.filter(customer => parseFloat(customer.outstandingAmount || '0') > 50000).slice(0, 1).map(customer => (
                <div key={customer.id} className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <DollarSign className="w-5 h-5 text-red-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-red-800">Payment Overdue</div>
                      <div className="text-xs text-red-600">
                        {customer.name} - {formatCurrencyCompact(parseFloat(customer.outstandingAmount || '0'))} outstanding
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Show message if no alerts */}
              {tanks.filter(tank => parseFloat(tank.currentStock || '0') <= parseFloat(tank.minimumLevel || '500')).length === 0 && 
               customers.filter(customer => parseFloat(customer.outstandingAmount || '0') > 50000).length === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-green-800">All Systems Normal</div>
                      <div className="text-xs text-green-600">No critical alerts at this time</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}