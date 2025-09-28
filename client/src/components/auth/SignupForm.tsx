import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Fuel, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface SignupFormProps {
  onBack: () => void;
}

export default function SignupForm({ onBack }: SignupFormProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "cashier" as const,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showApprovalMessage, setShowApprovalMessage] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/signup", {
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        isActive: false, // New users start inactive and need approval
      });

      if (response.ok) {
        const result = await response.json();
        
        // Check if it's an admin account (automatically active)
        if (formData.role === 'admin') {
          toast({
            title: "Admin account created",
            description: "Your admin account has been created successfully. You can now login.",
          });
          onBack(); // Go back to login form
        } else {
          setShowApprovalMessage(true);
          toast({
            title: "Account created",
            description: "Your account has been created successfully. Please wait for admin approval.",
          });
          // Instead of navigating to login, redirect to approval pending page
          navigate("/approval-pending");
        } 
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showApprovalMessage) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-sm border shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fuel className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-card-foreground">Account Created!</h2>
              <p className="text-muted-foreground">Awaiting Admin Approval</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Your account has been created successfully. Please wait for an administrator to approve your account before you can log in.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Waiting for approval...</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm border shadow-xl">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Fuel className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-card-foreground">Create Account</h2>
            <p className="text-muted-foreground">Join FuelFlow System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="block text-sm font-medium text-card-foreground mb-2">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full"
                required
              />
            </div>

            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-card-foreground mb-2">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Choose a username"
                className="w-full"
                required
              />
            </div>

            <div>
              <Label htmlFor="role" className="block text-sm font-medium text-card-foreground mb-2">
                Role
              </Label>
              <Select value={formData.role} onValueChange={(value: "cashier" | "manager") => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Create a password"
                className="w-full"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="block text-sm font-medium text-card-foreground mb-2">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your password"
                className="w-full"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}