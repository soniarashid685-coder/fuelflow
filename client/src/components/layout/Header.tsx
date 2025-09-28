import { useLocation } from "wouter";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "Point of Sale",
  "/sales-history": "Sales History",
  "/customers": "Customer Account Management",
  "/stock": "Stock & Inventory Management",
  "/purchase-orders": "Purchase Orders",
  "/accounts-receivable": "Accounts Receivable",
  "/accounts-payable": "Accounts Payable",
  "/cash-reconciliation": "Cash Reconciliation",
  "/expenses": "Expense Management",
  "/suppliers": "Supplier Management",
  "/pricing": "Price Management",
  "/financial-reports": "Financial Reports",
  "/pumps": "Pump Management",
  "/tanks": "Tank Monitoring",
};

export default function Header() {
  const [location] = useLocation();
  const currentDate = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  // Determine current shift based on time
  const getCurrentShift = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 18) {
      return "Day Shift";
    } else {
      return "Night Shift";
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          {/* Add space for mobile menu button */}
          <div className="w-12 lg:hidden flex-shrink-0"></div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-semibold text-card-foreground truncate" data-testid="page-title">
              {pageTitles[location] || "Dashboard"}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Comprehensive Petrol Pump Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-6 flex-shrink-0">
          <div className="text-right hidden lg:block">
            <div className="text-xs text-muted-foreground">Current Date</div>
            <div className="font-medium text-card-foreground text-sm" data-testid="current-date">{currentDate}</div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs text-muted-foreground">Shift</div>
            <div className="font-medium text-card-foreground text-sm" data-testid="current-shift">{getCurrentShift()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="font-medium text-green-600 text-sm" data-testid="till-status">Open</div>
          </div>
        </div>
      </div>
    </header>
  );
}
