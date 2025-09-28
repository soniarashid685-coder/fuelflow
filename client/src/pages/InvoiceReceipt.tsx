import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useStation } from "@/contexts/StationContext";
import { apiRequest } from "@/lib/api";
import { formatAmount } from "@/lib/currency";
import { Printer, Download, ArrowLeft, ChevronDown, FileText, Image } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generatePrintTemplate, globalPrintDocument, downloadAsPDF, downloadAsPNG } from "@/lib/printUtils";
import type {
  SalesTransaction,
  SalesTransactionItem,
  Customer,
  Product,
  Station,
  User
} from "@shared/schema";

interface TransactionWithDetails extends SalesTransaction {
  customer: Customer;
  user: User;
  station: Station;
  items: Array<SalesTransactionItem & { product: Product }>;
}

// Assuming you have a hook or context to get station settings
// For demonstration, we'll mock it. Replace with your actual hook/context.
const useStationSettings = () => {
  // In a real app, this would fetch settings from an API or context
  const [stationSettings, setStationSettings] = useState({
    stationName: "FuelFlow Station",
    address: "123 Fuel St, Petro City",
    contactNumber: "555-123-4567",
    email: "contact@fuelflow.com",
    gstNumber: "GST123456789",
    licenseNumber: "LICENSE987654321"
  });
  return { stationSettings };
};

export default function InvoiceReceipt() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { stationSettings } = useStation(); // Get station settings

  const { data: transaction, isLoading } = useQuery<TransactionWithDetails>({
    queryKey: ["/api/sales/detail", id!],
    enabled: !!id && !!user?.stationId,
  });

  // Check for print parameter from Sales History
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get('print') === '1';

    if (shouldPrint && !isLoading && transaction) {
      // Data is loaded, safe to print
      setTimeout(() => {
        window.print();
      }, 200); // Slightly longer delay for reliable printing
    }
  }, [isLoading, transaction]);

  const handlePrint = () => {
    if (!transaction) return;
    
    const template = generatePrintTemplate(transaction, 'invoice');
    globalPrintDocument(template);
  };

  const handleDownloadPDF = () => {
    const printContent = document.getElementById('invoice-print');
    if (!printContent) return;

    // Create a clone of the content to manipulate
    const clonedContent = printContent.cloneNode(true) as HTMLElement;

    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Invoice ${transaction?.invoiceNumber || 'Unknown'}</title>
          <style>
            @page { margin: 0.5in; size: A4; }
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .station-info h1 { color: #2563eb; font-size: 28px; margin: 0; }
            .invoice-title { font-size: 24px; font-weight: bold; text-align: right; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .items-table th { background: #f9fafb; font-weight: bold; }
            .totals { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          ${clonedContent.innerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-download as PDF
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();

      // Create download link for PDF
      const blob = new Blob([htmlContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${transaction?.invoiceNumber || 'unknown'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      printWindow.close();
    }, 1000);
  };

  const handleDownloadPNG = async () => {
    const invoiceElement = document.getElementById('invoice-print');
    if (!invoiceElement) return;

    try {
      // Create canvas and convert to image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions
      canvas.width = 800;
      canvas.height = 1200;

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add text content (simplified version)
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText(`Invoice: ${transaction?.invoiceNumber}`, 50, 50);
      ctx.fillText(`Customer: ${transaction?.customer?.name}`, 50, 80);
      ctx.fillText(`Amount: ${formatAmount(parseFloat(transaction?.totalAmount || '0'), transaction?.currencyCode || 'PKR')}`, 50, 110);

      // Create download link
      const link = document.createElement('a');
      link.download = `invoice-${transaction?.invoiceNumber || 'unknown'}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PNG download failed:', error);
      // Fallback notification
      alert('PNG download not available. Please use print or PDF option.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-48 mb-8"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-2xl font-bold mb-2">Transaction Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested invoice could not be found.
            </p>
            <Link href="/sales-history">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sales History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = parseFloat(transaction.outstandingAmount || '0') === 0;
  const isOverdue = transaction.dueDate && new Date(transaction.dueDate) < new Date() && !isPaid;

  return (
    <div className="min-h-screen bg-background">
      {/* Print/Download Actions - Hidden when printing */}
      <div className="print:hidden sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/sales-history">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Invoice #{transaction.invoiceNumber}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handlePrint} 
                variant="outline" 
                size="sm" 
                className="p-2" 
                data-testid="button-print" 
                title="Print Invoice"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="p-2" 
                    data-testid="button-download" 
                    title="Download Options"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleDownloadPDF} data-testid="download-pdf">
                    <FileText className="w-4 h-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPNG} data-testid="download-png">
                    <Image className="w-4 h-4 mr-2" />
                    Download PNG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8" id="invoice-print">
            {/* Header */}
            <div className="text-center mb-8 border-b border-gray-300 pb-6">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">{stationSettings?.stationName || 'FuelFlow Station'}</h1>
            <div className="text-sm text-gray-600 space-y-1">
              {stationSettings?.address && <p>{stationSettings.address}</p>}
              {stationSettings?.contactNumber && <p>Phone: {stationSettings.contactNumber}</p>}
              {stationSettings?.email && <p>Email: {stationSettings.email}</p>}
              {stationSettings?.gstNumber && <p>GST: {stationSettings.gstNumber}</p>}
            </div>
            <p className="text-lg text-gray-600 mt-4">Sales Invoice</p>
            <p className="text-sm text-gray-500">Invoice #{transaction.invoiceNumber}</p>
          </div>

            {/* Status Badges */}
            <div className="flex gap-2 mb-6">
              <Badge variant={isPaid ? "default" : "secondary"} data-testid="badge-payment-status">
                {isPaid ? "PAID" : "UNPAID"}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" data-testid="badge-overdue">
                  OVERDUE
                </Badge>
              )}
              <Badge variant="outline" data-testid="badge-payment-method">
                {transaction.paymentMethod.toUpperCase()}
              </Badge>
            </div>

            {/* Customer Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-lg mb-3">Bill To:</h3>
                <div className="space-y-1">
                  <p className="font-semibold" data-testid="text-customer-name">{transaction.customer.name}</p>
                  {transaction.customer.contactPhone && (
                    <p data-testid="text-customer-phone">Phone: {transaction.customer.contactPhone}</p>
                  )}
                  {transaction.customer.contactEmail && (
                    <p data-testid="text-customer-email">Email: {transaction.customer.contactEmail}</p>
                  )}
                  {transaction.customer.address && (
                    <p data-testid="text-customer-address">{transaction.customer.address}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">Transaction Details:</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Cashier:</span> <span data-testid="text-cashier-name">{transaction.user.fullName}</span></p>
                  <p><span className="font-semibold">Currency:</span> <span data-testid="text-currency">{transaction.currencyCode}</span></p>
                  {transaction.notes && (
                    <p><span className="font-semibold">Notes:</span> <span data-testid="text-notes">{transaction.notes}</span></p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">Items</h3>
              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-semibold text-sm border-b">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-right">Quantity</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                {transaction.items?.map((item, index) => (
                  <div key={item?.id || index} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0" data-testid={`row-item-${index}`}>
                    <div className="col-span-5">
                      <div className="font-semibold" data-testid={`text-product-name-${index}`}>{item?.product?.name || 'Unknown Product'}</div>
                      {item?.product?.hsnCode && (
                        <div className="text-xs text-muted-foreground" data-testid={`text-hsn-${index}`}>
                          HSN: {item.product.hsnCode}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right" data-testid={`text-quantity-${index}`}>
                      {parseFloat(item?.quantity || '0').toFixed(3)} {item?.product?.unit || 'L'}
                    </div>
                    <div className="col-span-2 text-right" data-testid={`text-unit-price-${index}`}>
                      {formatAmount(parseFloat(item?.unitPrice || '0'), transaction.currencyCode)}
                    </div>
                    <div className="col-span-3 text-right font-semibold" data-testid={`text-total-price-${index}`}>
                      {formatAmount(parseFloat(item?.totalPrice || '0'), transaction.currencyCode)}
                    </div>
                  </div>
                )) || []}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span data-testid="text-total-amount">{formatAmount(parseFloat(transaction.totalAmount ?? '0'), transaction.currencyCode)}</span>
                </div>
                {parseFloat(transaction.paidAmount ?? '0') > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid:</span>
                    <span data-testid="text-paid-amount">{formatAmount(parseFloat(transaction.paidAmount || '0'), transaction.currencyCode)}</span>
                  </div>
                )}
                {parseFloat(transaction.outstandingAmount ?? '0') > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Outstanding:</span>
                    <span data-testid="text-outstanding-amount">{formatAmount(parseFloat(transaction.outstandingAmount ?? '0'), transaction.currencyCode)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <Separator className="mb-6" />
            <div className="text-center text-sm text-muted-foreground">
              <p>Thank you for your business!</p>
              {stationSettings?.licenseNumber && (
                <p className="mt-1">License: {stationSettings.licenseNumber}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}