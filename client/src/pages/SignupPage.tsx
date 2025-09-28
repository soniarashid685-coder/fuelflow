
import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <LoginForm />;
  }

  return <SignupForm onBack={() => setShowLogin(true)} />;
}
