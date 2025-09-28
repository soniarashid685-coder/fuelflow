import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ApprovalPending from "@/pages/ApprovalPending";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [location] = useLocation();

  // Check if current route is public (doesn't require authentication)
  const isPublicRoute = ['/login', '/signup', '/approval-pending'].includes(location);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="text-lg font-medium text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If no user and not on a public route, show login
  if (!user && !isPublicRoute) {
    return <LoginForm />;
  }

  // If user exists but not approved (and not admin), show approval pending
  if (user && !user.isActive && user.role !== 'admin' && !isPublicRoute) {
    return <ApprovalPending userEmail={user.username} userName={user.fullName} />;
  }

  // If on public routes, render them directly
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Main authenticated layout with proper sidebar
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0`}>
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border">
          <Header />
          {/* Mobile menu button */}
          <div className="lg:hidden absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}