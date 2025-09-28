import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Download, Clock, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";

interface AgingBucketData {
  id: string;
  invoiceNumber?: string;
  orderNumber?: string;
  customerName?: string;
  supplierName?: string;
  transactionDate?: string;
  orderDate?: string;
  dueDate?: string;
  totalAmount?: number;
  outstandingAmount: number;
  paidAmount?: number;
  currencyCode: string;
  daysOverdue: number;
}

interface AgingReportData {
  type: 'receivable' | 'payable';
  buckets: {
    current: AgingBucketData[];
    days30: AgingBucketData[];
    days60: AgingBucketData[];
    days90: AgingBucketData[];
    over90: AgingBucketData[];
  };
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  };
  grandTotal: number;
}

export default function AgingReports() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState<'receivable' | 'payable'>('receivable');

  const { data: agingReport, isLoading } = useQuery<AgingReportData>({
    queryKey: [`/api/reports/aging/${user?.stationId}?type=${reportType}`],
    enabled: !!user?.stationId,
  });

  const exportToCSV = () => {
    if (!agingReport) return;

    const isReceivable = reportType === 'receivable';
    const headers = isReceivable 
      ? ['Invoice Number', 'Customer Name', 'Transaction Date', 'Due Date', 'Outstanding Amount', 'Currency', 'Days Overdue', 'Status']
      : ['Order Number', 'Supplier Name', 'Order Date', 'Due Date', 'Outstanding Amount', 'Currency', 'Days Overdue', 'Status'];

    const rows: string[][] = [];

    // Add data from all buckets
    Object.entries(agingReport.buckets).forEach(([bucketName, items]) => {
      items.forEach(item => {
        const daysOverdue = item.daysOverdue || 0;
        const status = daysOverdue <= 0 ? 'Current' : 
                     daysOverdue <= 30 ? '1-30 Days' :
                     daysOverdue <= 60 ? '31-60 Days' :
                     daysOverdue <= 90 ? '61-90 Days' : '90+ Days';

        if (isReceivable) {
          rows.push([
            item.invoiceNumber || 'N/A',
            item.customerName || 'Unknown Customer',
            item.transactionDate ? format(new Date(item.transactionDate), 'yyyy-MM-dd') : 'N/A',
            item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : 'N/A',
            (item.outstandingAmount || 0).toString(),
            item.currencyCode || '',
            (item.daysOverdue || 0).toString(),
            status
          ]);
        } else {
          rows.push([
            item.orderNumber || 'N/A',
            item.supplierName || 'Unknown Supplier',
            item.orderDate ? format(new Date(item.orderDate), 'yyyy-MM-dd') : 'N/A',
            item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : 'N/A',
            (item.outstandingAmount || 0).toString(),
            item.currencyCode || '',
            (item.daysOverdue || 0).toString(),
            status
          ]);
        }
      });
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aging-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getBadgeVariant = (daysOverdue: number) => {
    const days = daysOverdue || 0;
    if (days <= 0) return "default";
    if (days <= 30) return "secondary";
    if (days <= 60) return "outline";
    if (days <= 90) return "destructive";
    return "destructive";
  };

  const getBadgeIcon = (daysOverdue: number) => {
    const days = daysOverdue || 0;
    if (days <= 0) return <CheckCircle className="w-3 h-3" />;
    if (days <= 30) return <Clock className="w-3 h-3" />;
    if (days <= 90) return <AlertTriangle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const formatAmount = (amount: number, currencyCode?: string) => {
    // Assuming formatCurrency handles dynamic currency symbols based on currencyCode
    return formatCurrency(amount, currencyCode);
  };

  const renderBucketCard = (bucketName: string, bucketData: AgingBucketData[], total: number, label: string) => {
    const grandTotal = agingReport?.grandTotal || 0;
    const percentage = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;

    return (
      <Card key={bucketName} className="bg-white dark:bg-gray-800" data-testid={`card-bucket-${bucketName}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span data-testid={`text-bucket-${bucketName}`}>{label}</span>
            <Badge variant={bucketName === 'current' ? 'default' : bucketName === 'over90' ? 'destructive' : 'secondary'} data-testid={`badge-count-${bucketName}`}>
              {bucketData.length}
            </Badge>
          </CardTitle>
          <CardDescription className="text-2xl font-bold" data-testid={`text-amount-${bucketName}`}>
            {formatAmount(total)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} className="mb-2" data-testid={`progress-${bucketName}`} />
          <p className="text-xs text-muted-foreground" data-testid={`text-percentage-${bucketName}`}>{percentage}% of total outstanding</p>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!agingReport) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No Aging Data Available</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Unable to load aging report data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const buckets = [
    { name: 'current', data: agingReport.buckets.current, total: agingReport.totals.current, label: 'Current (0 days)' },
    { name: 'days30', data: agingReport.buckets.days30, total: agingReport.totals.days30, label: '1-30 Days' },
    { name: 'days60', data: agingReport.buckets.days60, total: agingReport.totals.days60, label: '31-60 Days' },
    { name: 'days90', data: agingReport.buckets.days90, total: agingReport.totals.days90, label: '61-90 Days' },
    { name: 'over90', data: agingReport.buckets.over90, total: agingReport.totals.over90, label: '90+ Days' }
  ];

  const isReceivable = reportType === 'receivable';

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-title">
            Aging Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid="text-subtitle">
            Track outstanding {reportType === 'receivable' ? 'receivables' : 'payables'} by aging periods
          </p>
        </div>
        <Button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-700" data-testid="button-export">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs value={reportType} onValueChange={(value) => setReportType(value as 'receivable' | 'payable')} data-testid="tabs-report-type">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receivable" data-testid="tab-receivable">
            Accounts Receivable
          </TabsTrigger>
          <TabsTrigger value="payable" data-testid="tab-payable">
            Accounts Payable
          </TabsTrigger>
        </TabsList>

        <TabsContent value={reportType} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {buckets.map(bucket => renderBucketCard(bucket.name, bucket.data, bucket.total, bucket.label))}
          </div>

          {/* Grand Total */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-grand-total-title">
                Total Outstanding {isReceivable ? 'Receivables' : 'Payables'}
              </CardTitle>
              <CardDescription className="text-3xl font-bold text-blue-600" data-testid="text-grand-total">
                {formatAmount(agingReport?.grandTotal || 0)}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Detailed Table */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle data-testid="text-details-title">Transaction Details</CardTitle>
              <CardDescription>
                Detailed breakdown of all outstanding {isReceivable ? 'receivables' : 'payables'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table data-testid="table-details">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isReceivable ? 'Invoice #' : 'Order #'}</TableHead>
                      <TableHead>{isReceivable ? 'Customer' : 'Supplier'}</TableHead>
                      <TableHead>{isReceivable ? 'Transaction Date' : 'Order Date'}</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buckets.map(bucket => 
                      bucket.data.map(item => (
                        <TableRow key={item.id} data-testid={`row-transaction-${item.id}`}>
                          <TableCell className="font-medium" data-testid={`text-number-${item.id}`}>
                            {isReceivable ? (item.invoiceNumber || 'N/A') : (item.orderNumber || 'N/A')}
                          </TableCell>
                          <TableCell data-testid={`text-entity-${item.id}`}>
                            {isReceivable ? (item.customerName || 'Unknown Customer') : (item.supplierName || 'Unknown Supplier')}
                          </TableCell>
                          <TableCell data-testid={`text-date-${item.id}`}>
                            {(() => {
                              const dateValue = isReceivable ? item.transactionDate : item.orderDate;
                              return dateValue ? format(new Date(dateValue), 'MMM dd, yyyy') : 'N/A';
                            })()}
                          </TableCell>
                          <TableCell data-testid={`text-due-${item.id}`}>
                            {item.dueDate ? format(new Date(item.dueDate), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="font-semibold" data-testid={`text-amount-${item.id}`}>
                            {formatAmount(item.outstandingAmount || 0, item.currencyCode)}
                          </TableCell>
                          <TableCell data-testid={`text-days-${item.id}`}>
                            {(item.daysOverdue || 0) > 0 ? `${item.daysOverdue || 0} days` : '-'}
                          </TableCell>
                          <TableCell data-testid={`badge-status-${item.id}`}>
                            {(() => {
                              const daysOverdue = item.daysOverdue || 0;
                              return (
                                <Badge variant={getBadgeVariant(daysOverdue)} className="flex items-center gap-1 w-fit">
                                  {getBadgeIcon(daysOverdue)}
                                  {daysOverdue <= 0 ? 'Current' : 
                                   daysOverdue <= 30 ? '1-30 Days' :
                                   daysOverdue <= 60 ? '31-60 Days' :
                                   daysOverdue <= 90 ? '61-90 Days' : '90+ Days'}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {buckets.every(bucket => bucket.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500" data-testid="text-no-data">
                          No outstanding {isReceivable ? 'receivables' : 'payables'} found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}