
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useStation } from "@/contexts/StationContext";
import { formatAmount } from "@/lib/currency";
import { Printer, Download, ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PurchaseOrder, Supplier, Station, User } from "@shared/schema";

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: Supplier;
  user: User;
  station: Station;
}

export default function PurchaseInvoice() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { stationSettings, isLoading: stationLoading } = useStation();

  const { data: order, isLoading } = useQuery<PurchaseOrderWithDetails>({
    queryKey: ["/api/purchase-orders/detail", id!],
    enabled: !!id && !!user?.stationId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const printContent = document.getElementById('purchase-invoice-print');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order ${order?.orderNumber || 'Unknown'}</title>
          <style>
            @page { margin: 0.5in; size: A4; }
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .station-info h1 { color: #2563eb; font-size: 28px; margin: 0; }
            .station-info p { margin: 5px 0; color: #666; }
            .order-title { font-size: 24px; font-weight: bold; text-align: right; }
            .order-meta { text-align: right; margin-top: 10px; }
            .order-meta p { margin: 5px 0; }
            .section { margin-bottom: 30px; }
            .section h3 { background: #f3f4f6; padding: 10px; margin: 0 0 15px 0; font-size: 16px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .detail-item { margin-bottom: 10px; }
            .detail-label { font-weight: bold; color: #374151; }
            .detail-value { color: #6b7280; }
            .totals { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .total-row.final { border-top: 2px solid #333; padding-top: 10px; margin-top: 15px; font-weight: bold; font-size: 18px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            .status-badge { background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="station-info">
                <h1>${order?.station?.name || "FuelFlow Station"}</h1>
                <p>Purchase Order Invoice</p>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <div class="order-title">PURCHASE ORDER</div>
                <div class="order-meta">
                  <p><strong>PO #:</strong> ${order?.orderNumber}</p>
                  <p><strong>Date:</strong> ${new Date(order?.orderDate || new Date()).toLocaleDateString()}</p>
                  ${order?.expectedDeliveryDate ? `<p><strong>Expected Delivery:</strong> ${new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>` : ''}
                  <div class="status-badge">${order?.status?.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Supplier Information</h3>
              <div class="details-grid">
                <div>
                  <div class="detail-item">
                    <div class="detail-label">Company Name:</div>
                    <div class="detail-value">${order?.supplier?.name || 'N/A'}</div>
                  </div>
                  ${order?.supplier?.contactPerson ? `
                  <div class="detail-item">
                    <div class="detail-label">Contact Person:</div>
                    <div class="detail-value">${order.supplier.contactPerson}</div>
                  </div>` : ''}
                </div>
                <div>
                  ${order?.supplier?.contactPhone ? `
                  <div class="detail-item">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${order.supplier.contactPhone}</div>
                  </div>` : ''}
                  ${order?.supplier?.contactEmail ? `
                  <div class="detail-item">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${order.supplier.contactEmail}</div>
                  </div>` : ''}
                </div>
              </div>
            </div>

            ${order?.notes ? `
            <div class="section">
              <h3>Order Notes</h3>
              <p>${order.notes}</p>
            </div>` : ''}

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatAmount(parseFloat(order?.subtotal || '0'), order?.currencyCode || 'PKR')}</span>
              </div>
              ${parseFloat(order?.taxAmount || '0') > 0 ? `
              <div class="total-row">
                <span>Tax:</span>
                <span>${formatAmount(parseFloat(order?.taxAmount || '0'), order?.currencyCode || 'PKR')}</span>
              </div>` : ''}
              <div class="total-row final">
                <span>Total Amount:</span>
                <span>${formatAmount(parseFloat(order?.totalAmount || '0'), order?.currencyCode || 'PKR')}</span>
              </div>
            </div>

            <div class="footer">
              <p>This is a computer-generated purchase order from FuelFlow Management System</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  if (isLoading || stationLoading) {
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

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-2xl font-bold mb-2">Purchase Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested purchase order could not be found.
            </p>
            <Link href="/purchase-orders">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Purchase Orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print/Download Actions - Hidden when printing */}
      <div className="print:hidden sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/purchase-orders">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Purchase Order #{order.orderNumber}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8" id="purchase-invoice-print">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                  {stationSettings?.stationName || 'FuelFlow Station'}
                </h1>
                <div className="text-muted-foreground space-y-1">
                  <p>Purchase Order Invoice</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold mb-2">PURCHASE ORDER</h2>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">PO #:</span> {order.orderNumber}</p>
                  <p><span className="font-semibold">Date:</span> {new Date(order.orderDate || new Date()).toLocaleDateString()}</p>
                  {order.expectedDeliveryDate && (
                    <p><span className="font-semibold">Expected Delivery:</span> {new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex gap-2 mb-6">
              <Badge variant="outline">
                {order.status?.toUpperCase()}
              </Badge>
            </div>

            {/* Supplier Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-lg mb-3">Supplier:</h3>
                <div className="space-y-1">
                  <p className="font-semibold">{order.supplier?.name}</p>
                  {order.supplier?.contactPerson && (
                    <p>Contact: {order.supplier.contactPerson}</p>
                  )}
                  {order.supplier?.contactPhone && (
                    <p>Phone: {order.supplier.contactPhone}</p>
                  )}
                  {order.supplier?.contactEmail && (
                    <p>Email: {order.supplier.contactEmail}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">Order Details:</h3>
                <div className="space-y-1 text-sm">
                  {order.notes && (
                    <p><span className="font-semibold">Notes:</span> {order.notes}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(parseFloat(order.subtotal || '0'), order.currencyCode || 'PKR')}</span>
                </div>
                {parseFloat(order.taxAmount || '0') > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatAmount(parseFloat(order.taxAmount || '0'), order.currencyCode || 'PKR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{formatAmount(parseFloat(order.totalAmount || '0'), order.currencyCode || 'PKR')}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 text-center text-sm text-muted-foreground">
              <p>Purchase Order generated on {new Date().toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
