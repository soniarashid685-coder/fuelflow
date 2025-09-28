import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import { signInWithGoogle, handleGoogleRedirect, auth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged, getIdToken } from "firebase/auth";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  stationId?: string;
  email?: string;
  photoURL?: string | null;
  isGoogleAuth?: boolean;
}

interface AuthContextType {
  user: User | null;
  userStatus: 'pending' | 'verified' | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<'pending' | 'verified' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and validate with server
    const token = localStorage.getItem("fuelflow_token");
    
    if (token) {
      // Validate token with server
      apiRequest("GET", "/api/auth/me")
        .then(response => response.json())
        .then(data => {
          const userData = data.user || data;
          setUser(userData);
          setUserStatus(userData.role === 'admin' || userData.isActive ? 'verified' : 'pending');
          setIsLoading(false);
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem("fuelflow_token");
          localStorage.removeItem("fuelflow_user");
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    // Set up periodic status check for non-admin users
    let statusInterval: NodeJS.Timeout;
    if (token) {
      statusInterval = setInterval(async () => {
        try {
          const response = await apiRequest("GET", "/api/auth/me");
          const data = await response.json();
          const userData = data.user || data;
          
          // If user was deactivated, force logout
          if (userData.role !== 'admin' && !userData.isActive && user?.isActive) {
            logout();
            setUserStatus('pending');
          } else {
            setUser(userData);
            setUserStatus(userData.role === 'admin' || userData.isActive ? 'verified' : 'pending');
          }
        } catch (error) {
          // If auth fails, logout
          logout();
        }
      }, 30000); // Check every 30 seconds
    }

    // Listen for user deactivation broadcasts
    const broadcastChannel = new BroadcastChannel('user-status');
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'USER_DEACTIVATED' && event.data.userId === user?.id) {
        logout();
        setUserStatus('pending');
      }
    };

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      broadcastChannel.close();
    };
    
    // Only handle Firebase auth if configured
    if (!isFirebaseConfigured) {
      return; // Skip Firebase auth handling
    }
    
    // Handle Google Auth redirect result
    handleGoogleRedirect().then(async (result) => {
      if (result) {
        try {
          // Get Firebase ID token
          const idToken = await getIdToken(result.user);
          
          // Send to backend for verification
          const response = await apiRequest("POST", "/api/auth/google", { idToken });
          const data = await response.json();
          
          setUser(data.user);
          localStorage.setItem("fuelflow_token", data.token);
          localStorage.setItem("fuelflow_user", JSON.stringify(data.user));
        } catch (error) {
          console.error('Google auth error:', error);
        }
      }
    }).catch(console.error);
    
    // Listen to Firebase auth state changes for Google users
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !user) {
        try {
          // Get Firebase ID token and verify with backend
          const idToken = await getIdToken(firebaseUser);
          const response = await apiRequest("POST", "/api/auth/google", { idToken });
          const data = await response.json();
          
          setUser(data.user);
          localStorage.setItem("fuelflow_token", data.token);
          localStorage.setItem("fuelflow_user", JSON.stringify(data.user));
        } catch (error) {
          console.error('Firebase auth verification error:', error);
        }
      }
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.message?.includes("pending") || data.message?.includes("approval")) {
          setUserStatus('pending');
          throw new Error(data.message);
        }
        throw new Error(data.message || "Login failed");
      }
      
      setUser(data.user);
      // Admin users are always verified, others depend on isActive status
      setUserStatus(data.user.role === 'admin' || data.user.isActive ? 'verified' : 'pending');
      localStorage.setItem("fuelflow_token", data.token);
      localStorage.setItem("fuelflow_user", JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
      // User will be set via the redirect handler
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw new Error("Google sign-in failed");
    }
  };

  const logout = async () => {
    try {
      // Sign out from Firebase if it's a Google auth user
      if (user?.isGoogleAuth) {
        await auth.signOut();
      }
      setUser(null);
      localStorage.removeItem("fuelflow_token");
      localStorage.removeItem("fuelflow_user");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, userStatus, isAuthenticated, login, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
