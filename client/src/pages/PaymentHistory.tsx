import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useStation } from "@/contexts/StationContext";
import { apiRequest } from "@/lib/api";
import { ArrowLeft, Download, Printer, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { generatePrintTemplate, printDocument, downloadAsPDF, downloadAsPNG } from "@/lib/printUtils";
import type { Payment, Customer, Supplier } from "@shared/schema";
import { formatCompactNumber } from "@/lib/utils";
import { printReport } from "@/lib/printUtils";

interface PaymentWithDetails extends Payment {
  customer?: Customer;
  supplier?: Supplier;
}

function PaymentHistory() {
  const { id, type } = useParams<{ id: string; type: string }>();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { stationSettings } = useStation();

  const { data: payments = [], isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments", user?.stationId, id, type],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/payments/${user?.stationId}`);
      const allPayments = await response.json();
      return allPayments.filter((payment: PaymentWithDetails) =>
        type === 'customer' ? payment.customerId === id : payment.supplierId === id
      );
    },
    enabled: !!user?.stationId && !!id && !!type,
  });

  const { data: customerData } = useQuery<Customer>({
    queryKey: ["/api/customers", id],
    queryFn: () => apiRequest("GET", `/api/customers/${id}`).then(res => res.json()),
    enabled: !!id && type === 'customer',
  });

  const { data: supplierData } = useQuery<Supplier>({
    queryKey: ["/api/suppliers", id],
    queryFn: () => apiRequest("GET", `/api/suppliers/${id}`).then(res => res.json()),
    enabled: !!id && type === 'supplier',
  });

  const entity = type === 'customer' ? customerData : supplierData;
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filteredPayments, setFilteredPayments] = useState([]);

  const handleFilter = () => {
    let filtered = payments.filter((payment: any) => {
      const matchesSearch = payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || payment.type === typeFilter;
      const matchesMethod = methodFilter === "all" || payment.paymentMethod === methodFilter;

      let matchesDate = true;
      if (fromDate && toDate) {
        const paymentDate = new Date(payment.paymentDate).toDateString();
        const from = new Date(fromDate).toDateString();
        const to = new Date(toDate).toDateString();
        matchesDate = paymentDate >= from && paymentDate <= to;
      }

      return matchesSearch && matchesType && matchesMethod && matchesDate;
    });
    setFilteredPayments(filtered);
  };

  const handlePrintReport = () => {
    const reportData = filteredPayments.map((payment: any) => ({
      'Reference': payment.referenceNumber,
      'Type': payment.type,
      'Party': payment.customer?.name || payment.supplier?.name || 'N/A',
      'Amount': formatCompactNumber(payment.amount),
      'Method': payment.paymentMethod,
      'Date': new Date(payment.paymentDate).toLocaleDateString(),
      'Notes': payment.notes || 'N/A'
    }));

    const dateRange = fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Records';

    printReport({
      title: 'Payment History Report',
      subtitle: `Period: ${dateRange}`,
      data: reportData,
      summary: [
        { label: 'Total Payments', value: filteredPayments.length.toString() },
        { label: 'Total Amount', value: formatCompactNumber(filteredPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)) }
      ]
    });
  };

  useEffect(() => {
    setFilteredPayments(payments);
  }, [payments]);

  useEffect(() => {
    handleFilter();
  }, [searchTerm, typeFilter, methodFilter, payments, fromDate, toDate]);


  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href={type === 'customer' ? '/accounts-receivable' : '/accounts-payable'}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">Payment History - {entity?.name}</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button onClick={handlePrint} size="sm" className="w-full sm:w-auto">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button onClick={handleDownloadPNG} variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <Card className="print:shadow-none print:border-none">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span>Payment History</span>
              <div className="text-sm text-muted-foreground">
                Total: {formatCurrency(totalPayments)} | Outstanding: {formatCurrency(parseFloat(entity?.outstandingAmount || '0'))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search payments..."
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
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="receivable">Receivable</SelectItem>
                    <SelectItem value="payable">Payable</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleFilter}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {filteredPayments.length > 0 ? filteredPayments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-md gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{formatCurrency(parseFloat(payment.amount))}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()} • {payment.paymentMethod}
                    </div>
                    {payment.referenceNumber && (
                      <div className="text-xs text-muted-foreground">Ref: {payment.referenceNumber}</div>
                    )}
                    {payment.notes && (
                      <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{payment.type}</Badge>
                    <div className="text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )) : (
                // Sample payment records for template demonstration
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-md gap-4 opacity-60">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{formatCurrency(5000)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(Date.now() - 86400000).toLocaleDateString()} • Cash
                      </div>
                      <div className="text-xs text-muted-foreground">Ref: PAY-001</div>
                      <div className="text-xs text-muted-foreground mt-1">Partial payment received</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">receivable</Badge>
                      <div className="text-xs text-muted-foreground">
                        {new Date(Date.now() - 86400000).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-md gap-4 opacity-60">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{formatCurrency(3000)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(Date.now() - 172800000).toLocaleDateString()} • Card
                      </div>
                      <div className="text-xs text-muted-foreground">Ref: PAY-002</div>
                      <div className="text-xs text-muted-foreground mt-1">Credit payment</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">receivable</Badge>
                      <div className="text-xs text-muted-foreground">
                        {new Date(Date.now() - 172800000).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-muted-foreground py-4 text-xs">
                    <div className="text-sm font-medium mb-2">Sample Payment Records</div>
                    <div className="text-xs">These are sample records. Real payments will appear here once recorded.</div>
                  </div>
                </>
              )}
            </div>

            {filteredPayments.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{filteredPayments.length}</div>
                    <div className="text-sm text-muted-foreground">Total Payments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(filteredPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0))}</div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(parseFloat(entity?.outstandingAmount || '0'))}</div>
                    <div className="text-sm text-muted-foreground">Outstanding</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PaymentHistory;