import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { generatePrintTemplate, downloadAsPDF, downloadAsPNG } from "@/lib/printUtils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { SalesTransaction, PurchaseOrder, Payment, Expense, PumpReading } from "@shared/schema";

type PrintType = 'invoice' | 'receipt' | 'statement' | 'expense' | 'purchaseOrder' | 'pumpReading';
type PrintMode = 'print' | 'download';
type PrintFormat = 'pdf' | 'png';

export default function PrintView() {
  const [, navigate] = useLocation();
  const [isReady, setIsReady] = useState(false);
  
  // Parse search params from window.location.search
  const searchParams = new URLSearchParams(window.location.search);
  const type = searchParams.get('type') as PrintType;
  const id = searchParams.get('id');
  const mode = searchParams.get('mode') as PrintMode || 'print';
  const format = searchParams.get('format') as PrintFormat || 'pdf';
  const returnUrl = searchParams.get('return') || '/dashboard';

  // Determine which API endpoint to use based on type
  const getQueryKey = (type: PrintType, id: string) => {
    switch (type) {
      case 'invoice':
      case 'receipt':
        return [`/api/sales/${id}`];
      case 'purchaseOrder':
        return [`/api/purchase-orders/${id}`];
      case 'expense':
        return [`/api/expenses/${id}`];
      case 'statement':
        return [`/api/payments/${id}/statement`];
      case 'pumpReading':
        return [`/api/pump-readings/${id}`];
      default:
        return null;
    }
  };

  const queryKey = getQueryKey(type, id || '');
  
  const { data, isLoading, error } = useQuery({
    queryKey: queryKey || ['invalid'],
    enabled: !!queryKey && !!id,
  });

  // Auto-trigger action when data is loaded
  useEffect(() => {
    if (!isLoading && data && !isReady) {
      setIsReady(true);
      
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        if (mode === 'print') {
          window.print();
        } else if (mode === 'download') {
          handleDownload();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, data, isReady, mode]);

  const handleDownload = async () => {
    if (!data) return;
    
    // Map new types to existing ones temporarily
    const mappedType = type === 'purchaseOrder' ? 'invoice' : 
                      type === 'pumpReading' ? 'receipt' : 
                      type as 'invoice' | 'receipt' | 'statement' | 'expense';
    
    const template = generatePrintTemplate(data, mappedType);
    
    try {
      if (format === 'pdf') {
        downloadAsPDF(template);
      } else {
        await downloadAsPNG(template);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleBack = () => {
    navigate(returnUrl);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!type || !id) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid Print Request</h1>
          <p className="mt-2 text-gray-600">Missing required parameters: type and id</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="mt-2 text-gray-600">Preparing document for {type}...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading Document</h1>
          <p className="mt-2 text-gray-600">Unable to load {type} with ID: {id}</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Map new types to existing ones temporarily
  const mappedType = type === 'purchaseOrder' ? 'invoice' : 
                    type === 'pumpReading' ? 'receipt' : 
                    type as 'invoice' | 'receipt' | 'statement' | 'expense';
  
  const template = generatePrintTemplate(data, mappedType);

  return (
    <div className="print-view">
      {/* Print/Download Actions - Hidden during print */}
      <div className="no-print fixed top-4 right-4 z-50 flex space-x-2">
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download {format.toUpperCase()}
        </Button>
      </div>

      {/* Print Content */}
      <div 
        id="print-content"
        dangerouslySetInnerHTML={{ __html: template.content }}
        className="print-only-styles"
      />

      {/* Print-specific styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            
            body {
              margin: 0;
              padding: 0;
            }
            
            .print-view {
              width: 100%;
              height: 100%;
            }
            
            #print-content {
              width: 100%;
              height: 100%;
            }
          }
          
          @media screen {
            .print-only-styles {
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              background: white;
              min-height: 297mm;
            }
          }
        `
      }} />
    </div>
  );
}