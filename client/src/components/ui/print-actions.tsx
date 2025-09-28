import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Printer, 
  Download, 
  FileText, 
  Image, 
  ChevronDown 
} from "lucide-react";
import { generatePrintTemplate, globalPrintDocument, downloadAsPDF, downloadAsPNG } from "@/lib/printUtils";

type PrintType = 'invoice' | 'receipt' | 'statement' | 'expense' | 'purchaseOrder' | 'pumpReading';
type PrintFormat = 'pdf' | 'png';

interface PrintActionsProps {
  /** The type of document to print */
  type: PrintType;
  /** The ID of the document */
  id: string;
  /** Optional return URL after printing (defaults to current page) */
  returnUrl?: string;
  /** Custom button variant */
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  /** Custom button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show as individual buttons instead of dropdown */
  layout?: 'dropdown' | 'buttons';
  /** Custom class names */
  className?: string;
  /** Show compact version (icon only) */
  compact?: boolean;
}

// Helper function to get API endpoint based on document type
const getApiEndpoint = (type: PrintType) => {
  switch (type) {
    case 'invoice':
    case 'receipt':
      return '/api/sales';
    case 'purchaseOrder':
      return '/api/purchase-orders';
    case 'expense':
      return '/api/expenses';
    case 'statement':
      return '/api/payments';
    case 'pumpReading':
      return '/api/pump-readings';
    default:
      return '/api/sales';
  }
};

export function PrintActions({ 
  type, 
  id, 
  returnUrl, 
  variant = "outline", 
  size = "default",
  layout = "dropdown",
  className = "",
  compact = false
}: PrintActionsProps) {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Get current URL for return navigation
  const currentUrl = returnUrl || window.location.pathname + window.location.search;

  const handlePrint = async () => {
    setIsLoading(true);
    try {
      // Fetch the data for the document
      const apiEndpoint = getApiEndpoint(type);
      const response = await fetch(`${apiEndpoint}/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to fetch document data');
      }
      
      const data = await response.json();
      const template = generatePrintTemplate(data, type);
      
      // Use global print function
      globalPrintDocument(template);
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: PrintFormat) => {
    setIsLoading(true);
    try {
      // Fetch the data for the document
      const apiEndpoint = getApiEndpoint(type);
      const response = await fetch(`${apiEndpoint}/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to fetch document data');
      }
      
      const data = await response.json();
      const template = generatePrintTemplate(data, type);
      
      if (format === 'pdf') {
        downloadAsPDF(template);
      } else {
        await downloadAsPNG(template);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get document type display name
  const getDocumentName = (type: PrintType) => {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'receipt': return 'Receipt';
      case 'statement': return 'Statement';
      case 'expense': return 'Expense Receipt';
      case 'purchaseOrder': return 'Purchase Order';
      case 'pumpReading': return 'Pump Reading';
      default: return 'Document';
    }
  };

  if (layout === 'buttons') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        <Button
          onClick={handlePrint}
          variant={variant}
          size={size}
          disabled={isLoading}
          data-testid={`button-print-${type}`}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button
          onClick={() => handleDownload('pdf')}
          variant={variant}
          size={size}
          disabled={isLoading}
          data-testid={`button-download-pdf-${type}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          PDF
        </Button>
        <Button
          onClick={() => handleDownload('png')}
          variant={variant}
          size={size}
          disabled={isLoading}
          data-testid={`button-download-png-${type}`}
        >
          <Image className="w-4 h-4 mr-2" />
          PNG
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          disabled={isLoading}
          className={className}
          data-testid={`button-print-actions-${type}`}
          title={`Print ${getDocumentName(type)}`}
        >
          <Printer className="w-4 h-4" />
          {!compact && (
            <>
              <span className="ml-2">{isLoading ? 'Loading...' : `Print ${getDocumentName(type)}`}</span>
              <ChevronDown className="w-4 h-4 ml-2" />
            </>
          )}
          {compact && <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={handlePrint}
          data-testid={`menu-print-${type}`}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Document
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleDownload('pdf')}
          data-testid={`menu-download-pdf-${type}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Download as PDF
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDownload('png')}
          data-testid={`menu-download-png-${type}`}
        >
          <Image className="w-4 h-4 mr-2" />
          Download as PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default PrintActions;