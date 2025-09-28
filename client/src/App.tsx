import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { StationProvider } from "./contexts/StationContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Dashboard from "@/pages/Dashboard";
import PointOfSale from "@/pages/PointOfSale";
import CustomerManagement from "@/pages/CustomerManagement";
import StockManagement from "@/pages/StockManagement";
import FinancialReports from "./pages/FinancialReports";
import AgingReports from "./pages/AgingReports";
import CustomerActivity from "./pages/CustomerActivity";
import GeneralLedger from "./pages/GeneralLedger";
import SalesHistory from "@/pages/SalesHistory";
import PurchaseOrders from "@/pages/PurchaseOrders";
import AccountsReceivable from "@/pages/AccountsReceivable";
import AccountsPayable from "@/pages/AccountsPayable";
import CashReconciliation from "@/pages/CashReconciliation";
import ExpenseManagement from "@/pages/ExpenseManagement";
import SupplierManagement from "@/pages/SupplierManagement";
import PriceManagement from "@/pages/PriceManagement";
import InvoiceReceipt from "@/pages/InvoiceReceipt";
import TankMonitoring from "@/pages/TankMonitoring";
import DailyReports from "@/pages/DailyReports";
import Settings from "@/pages/Settings";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";
import PumpManagement from "@/pages/PumpManagement";
import PurchaseInvoice from "@/pages/PurchaseInvoice";
import PaymentHistory from "@/pages/PaymentHistory";
import ApprovalPending from "@/pages/ApprovalPending";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import PrintView from "@/pages/PrintView";

// Global theme initialization
function ThemeBootstrap() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pos" component={PointOfSale} />
      <Route path="/sales-history" component={SalesHistory} />
      <Route path="/customers" component={CustomerManagement} />
      <Route path="/stock" component={StockManagement} />
      <Route path="/purchase-orders" component={PurchaseOrders} />
      <Route path="/accounts-receivable" component={AccountsReceivable} />
      <Route path="/accounts-payable" component={AccountsPayable} />
      <Route path="/cash-reconciliation" component={CashReconciliation} />
      <Route path="/expenses" component={ExpenseManagement} />
      <Route path="/suppliers" component={SupplierManagement} />
      <Route path="/pricing" component={PriceManagement} />
      <Route path="/financial-reports" component={FinancialReports} />
      <Route path="/invoice/:id" component={InvoiceReceipt} />
      <Route path="/purchase-invoice/:id" component={PurchaseInvoice} />
      <Route path="/payment-history/:id/:type" component={PaymentHistory} />
      <Route path="/tanks" component={TankMonitoring} />
      <Route path="/pumps" component={PumpManagement} />
      <Route path="/daily-reports" component={DailyReports} />
      <Route path="/aging-reports" component={AgingReports} />
      <Route path="/general-ledger" component={GeneralLedger} />
      <Route path="/customer-activity" component={CustomerActivity} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/approval-pending" component={ApprovalPending} />
      <Route path="/print" component={PrintView} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StationProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <ThemeBootstrap />
              <Toaster />
              <AuthGuard>
                <Router />
              </AuthGuard>
            </TooltipProvider>
          </CurrencyProvider>
        </StationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;