import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, 
  ShoppingCart, 
  ClipboardList, 
  Fuel, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  CreditCard, 
  Users, 
  Building2, 
  Tag, 
  Calendar, 
  Clock, 
  Settings, 
  LogOut,
  Menu,
  Shield,
  X,
  BookOpen,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Define a reusable SidebarNavItem component
function SidebarNavItem({ icon, label, to, isActive, isCollapsed }) {
  return (
    <Link
      href={to}
      className={cn(
        "flex items-center text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors relative",
        isCollapsed 
          ? "px-3 py-3 mx-1 mb-1 justify-center" 
          : "px-4 py-2.5 mx-2 mb-1",
        isActive && "bg-accent text-accent-foreground"
      )}
      title={isCollapsed ? label : undefined}
    >
      {icon}
      {!isCollapsed && (
        <span className="ml-3">{label}</span>
      )}
    </Link>
  );
}

const navigationItems = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/", icon: BarChart3 },
    ]
  },
  {
    label: "Sales & Transactions",
    items: [
      { name: "Point of Sale", path: "/pos", icon: ShoppingCart },
      { name: "Sales History & Receipts", path: "/sales-history", icon: ClipboardList },
    ]
  },
  {
    label: "Inventory",
    items: [
      { name: "Stock Management", path: "/stock", icon: Package },
      { name: "Tank Monitoring", path: "/tanks", icon: Fuel },
      { name: "Pump Management", path: "/pumps", icon: Fuel },
      { name: "Purchase Orders", path: "/purchase-orders", icon: Package },
    ]
  },
  {
    label: "Accounting",
    items: [
      { name: "Accounts Receivable", path: "/accounts-receivable", icon: TrendingUp },
      { name: "Accounts Payable", path: "/accounts-payable", icon: TrendingDown },
      { name: "Cash Reconciliation", path: "/cash-reconciliation", icon: RefreshCw },
      { name: "Expense Management", path: "/expenses", icon: CreditCard },
    ]
  },
  {
    label: "Relationships",
    items: [
      { name: "Customer Accounts", path: "/customers", icon: Users },
      { name: "Supplier Management", path: "/suppliers", icon: Building2 },
      { name: "Price Management", path: "/pricing", icon: Tag },
    ]
  },
  {
    label: "Financial Reports",
    items: [
      { name: "Financial Statements", path: "/financial-reports", icon: BarChart3 },
      { name: "Daily Reports", path: "/daily-reports", icon: Calendar },
      { name: "Aging Reports", path: "/aging-reports", icon: Clock },
      { name: "General Ledger", path: "/general-ledger", icon: BookOpen },
      { name: "Customer Activity", path: "/customer-activity", icon: Activity },
    ]
  },
  {
    label: "System",
    items: [
      { name: "Settings", path: "/settings", icon: Settings },
    ]
  }
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div 
      className={cn(
        "sidebar-transition h-full bg-card border-r border-border flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
      data-sidebar
    >
      {/* Header */}
      <div className={cn(
        "border-b border-border flex-shrink-0",
        isCollapsed ? "p-3" : "p-6"
      )}>
        <div className="flex items-center">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground flex-shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-card-foreground truncate" data-testid="app-title">FuelFlow</h1>
                <p className="text-xs text-muted-foreground truncate" data-testid="current-station">Main Station</p>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 hover:bg-accent flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Menu/Collapse Button before navigation */}
        <div className={cn(
          "flex mb-2",
          isCollapsed ? "justify-center px-2" : "justify-start px-4"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 hover:bg-accent lg:flex hidden"
            data-testid="sidebar-toggle"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {navigationItems.map((section, sectionIndex) => (
          <div key={section.label}>
            {!isCollapsed && (
              <div className="px-4 mb-3 mt-6 first:mt-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {section.label}
                </div>
              </div>
            )}
            {section.items.map((item, itemIndex) => (
              <div key={item.path}>
                <SidebarNavItem 
                  icon={<item.icon className="w-5 h-5" />} 
                  label={item.name} 
                  to={item.path} 
                  isActive={location === item.path}
                  isCollapsed={isCollapsed}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Admin specific navigation */}
        {user?.role === "admin" && (
          <>
            {!isCollapsed && (
              <div className="px-4 mb-3 mt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Admin
                </div>
              </div>
            )}
            <SidebarNavItem 
              icon={<Shield className="w-5 h-5" />} 
              label="Admin Panel" 
              to="/admin" 
              isActive={location === "/admin"}
              isCollapsed={isCollapsed}
            />
          </>
        )}
      </nav>

      {/* Footer with User Profile */}
      <div className="border-t border-border bg-card flex-shrink-0 p-4">
        <div className="flex items-center justify-between">
          {/* User Avatar and Info */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={cn(
              "bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0",
              isCollapsed ? "w-8 h-8" : "w-10 h-10"
            )}>
              <span data-testid="user-initials">{user?.fullName?.charAt(0) || "U"}</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-card-foreground truncate" data-testid="current-user">
                  {user?.fullName || "User"}
                </div>
                <div className="text-xs text-muted-foreground" data-testid="current-role">
                  {user?.role || "User"}
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          {!isCollapsed && (
            <div className="flex items-center">
              <button 
                onClick={logout} 
                className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                data-testid="button-logout"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}