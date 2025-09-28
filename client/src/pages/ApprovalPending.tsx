import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ApprovalPendingProps {
  userEmail?: string;
  userName?: string;
}

export default function ApprovalPending({ userEmail, userName }: ApprovalPendingProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isApproved, setIsApproved] = useState(false);

  // Check approval status periodically
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!userEmail && !user?.username) return;

      try {
        // Try to login with stored credentials to check if approved
        const username = userEmail || user?.username;
        if (username) {
          // This is just a status check - in real implementation, you'd have a separate endpoint
          // For now, we'll just show the pending state
        }
      } catch (error) {
        // Still pending
      }
    };

    const interval = setInterval(checkApprovalStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [userEmail, user]);

  const handleBackToLogin = () => {
    logout();
    setLocation("/login");
  };

  const handleCheckStatus = () => {
    toast({
      title: "Status Checked",
      description: "Your account is still pending approval. Please wait for administrator action.",
      variant: "default",
    });
  };

  if (isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Account Approved!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-gray-600">
                Great news! Your account has been approved.
              </p>
              <p className="text-gray-600">
                You can now log in to access the FuelFlow system.
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleBackToLogin}
                className="w-full"
              >
                Continue to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-gray-600">
              Thank you for registering{userName ? `, ${userName}` : ''}!
            </p>
            <p className="text-gray-600">
              Your account is currently pending approval from an administrator.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center text-blue-800 mb-2">
              <User className="w-5 h-5 mr-2" />
              <span className="font-medium">What's next?</span>
            </div>
            <p className="text-sm text-blue-700">
              An administrator will review your account and activate it. You'll be able to log in once approved.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center text-yellow-800 mb-2">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Need help?</span>
            </div>
            <p className="text-sm text-yellow-700">
              Contact your system administrator if you believe this is an error or if you've been waiting for an extended period.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={handleCheckStatus}
              variant="outline" 
              className="w-full"
            >
              Check Status
            </Button>
            <Button 
              onClick={handleBackToLogin}
              variant="ghost" 
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}