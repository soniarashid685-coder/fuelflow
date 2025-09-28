import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { Eye, Download, Filter, Calculator, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { globalPrintDocument } from "@/lib/printUtils";

interface CustomerActivity {
  id: string;
  customerId: string;
  customerName: string;
  type: 'sale' | 'payment' | 'credit' | 'adjustment';
  description: string;
  amount: number;
  balance: number;
  date: string;
  referenceNumber: string;
  paymentMethod?: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export default function CustomerActivity() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [dateRange, setDateRange] = useState("this-month");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [selectedActivity, setSelectedActivity] = useState<CustomerActivity | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    customer: "all",
    activityType: "all",
    fromDate: undefined as Date | undefined,
    toDate: undefined as Date | undefined,
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      customer: selectedCustomer,
      activityType: activityType,
      fromDate: fromDate,
      toDate: toDate,
    });
  };

  const handlePrintReport = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Activity Report</title>
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
            <h1>Customer Activity Report</h1>
            <p>Generated on ${format(new Date(), 'PPP')}</p>
            ${appliedFilters.fromDate && appliedFilters.toDate ? 
              `<p>Period: ${format(appliedFilters.fromDate, 'PPP')} to ${format(appliedFilters.toDate, 'PPP')}</p>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Activity</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredActivities.map(activity => `
                <tr>
                  <td>${format(new Date(activity.date), 'MMM dd, yyyy hh:mm a')}</td>
                  <td>${activity.customerName}</td>
                  <td>${activity.type}</td>
                  <td>${activity.description}</td>
                  <td class="amount">${formatCurrency(activity.amount)}</td>
                  <td class="amount">${formatCurrency(activity.balance)}</td>
                  <td>${activity.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    globalPrintDocument(printContent, `Customer_Activity_Report_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: activities = [], isLoading } = useQuery<CustomerActivity[]>({
    queryKey: ["/api/customer-activities", user?.stationId, selectedCustomer, activityType, dateRange],
    enabled: !!user?.stationId,
  });

  const filteredActivities = activities.filter((activity) =>
    activity.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (activity: CustomerActivity) => {
    setSelectedActivity(activity);
    setDetailsOpen(true);
  };

  const handleExportActivities = () => {
    const csvContent = [
      ['Date', 'Customer', 'Type', 'Description', 'Amount', 'Balance', 'Reference', 'Status'],
      ...filteredActivities.map(activity => [
        format(new Date(activity.date), 'yyyy-MM-dd'),
        activity.customerName,
        activity.type,
        activity.description,
        activity.amount.toString(),
        activity.balance.toString(),
        activity.referenceNumber,
        activity.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customer-activities-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale': return '🛒';
      case 'payment': return '💰';
      case 'credit': return '💳';
      case 'adjustment': return '⚙️';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
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
          <h3 className="text-2xl font-semibold text-card-foreground">Customer Activity Timeline</h3>
          <p className="text-muted-foreground">Track all customer interactions and transaction history</p>
        </div>
        <Button onClick={handleExportActivities} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{activities.length}</div>
            <div className="text-sm text-muted-foreground">Total Activities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {activities.filter(a => a.type === 'sale').length}
            </div>
            <div className="text-sm text-muted-foreground">Sales Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {activities.filter(a => a.type === 'payment').length}
            </div>
            <div className="text-sm text-muted-foreground">Payments Received</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(activities.reduce((sum, a) => sum + a.amount, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              <label className="block text-sm font-medium mb-2">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Activity Type</label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="credit">Credits</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleApplyFilters}
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handlePrintReport}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Date & Time</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Activity</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity, index) => (
                  <tr key={activity.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium">
                        {format(new Date(activity.date), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(activity.date), 'hh:mm a')}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{activity.customerName}</div>
                      <div className="text-sm text-muted-foreground">ID: {activity.customerId.slice(-6)}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getActivityIcon(activity.type)}</span>
                        <span className="capitalize font-medium">{activity.type}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ref: {activity.referenceNumber}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs truncate">{activity.description}</div>
                      {activity.paymentMethod && (
                        <div className="text-sm text-muted-foreground">
                          via {activity.paymentMethod}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${
                        activity.type === 'payment' ? 'text-green-600' : 
                        activity.type === 'sale' ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {activity.type === 'payment' ? '+' : activity.type === 'sale' ? '-' : ''}
                        {formatCurrency(Math.abs(activity.amount))}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${
                        activity.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(activity.balance)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(activity)}
                        className="p-2"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredActivities.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No activities found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activity Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Activity Type</label>
                  <p className="text-sm text-muted-foreground capitalize">{selectedActivity.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedActivity.date), 'MMM dd, yyyy hh:mm a')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reference Number</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity.referenceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedActivity.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Running Balance</label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedActivity.balance)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{selectedActivity.description}</p>
                </div>
                {selectedActivity.paymentMethod && (
                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <p className="text-sm text-muted-foreground">{selectedActivity.paymentMethod}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={getStatusColor(selectedActivity.status)}>
                    {selectedActivity.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}