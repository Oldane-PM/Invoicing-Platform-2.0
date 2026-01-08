import * as React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AlertCircle, Loader2, Mail, User } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase/client";
import type { UserRole } from "../lib/supabase/repos/auth.repo";

type LoginMode = "role" | "email";
type AuthUserType = "contractor" | "manager";

interface LoginProps {
  onLogin: (username: string) => void;
  onSupabaseLogin?: (role: UserRole) => void;
  signIn?: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  authLoading?: boolean;
}

export function Login({ onLogin, onSupabaseLogin, signIn, authLoading }: LoginProps) {
  const [mode, setMode] = React.useState<LoginMode>("role");
  const [authUserType, setAuthUserType] = React.useState<AuthUserType>("contractor");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Role-based login (Admin - mock) or switch to email mode for Manager/Contractor
  const handleRoleLogin = () => {
    setError("");

    if (username === "Admin") {
      // Admin still uses mock login
      onLogin(username);
    } else if (username === "Manager") {
      // Switch to email login mode for Manager
      if (isSupabaseConfigured && signIn) {
        setAuthUserType("manager");
        setMode("email");
        setUsername("");
      } else {
        // Fallback to mock if Supabase not configured
        onLogin(username);
      }
    } else if (username === "Contractor") {
      // Switch to email login mode for Contractors
      if (isSupabaseConfigured && signIn) {
        setAuthUserType("contractor");
        setMode("email");
        setUsername("");
      } else {
        // Fallback to mock if Supabase not configured
        onLogin(username);
      }
    } else {
      setError("Invalid username. Use Admin, Manager, or Contractor.");
    }
  };

  // Email/password login (Manager/Contractor - real auth)
  const handleEmailLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    if (!signIn) {
      setError("Authentication not available");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success && result.role) {
        // Verify the user has the expected role
        const expectedRole = authUserType === "manager" ? "MANAGER" : "CONTRACTOR";
        if (result.role !== expectedRole) {
          setError(`This account is not a ${authUserType}. Please use the correct login.`);
          return;
        }

        // Auth state will be handled by useAuth hook
        onSupabaseLogin?.(result.role);
      } else if (result.success && !result.role) {
        // Logged in but no profile - assume the role based on selection
        const assumedRole: UserRole = authUserType === "manager" ? "MANAGER" : "CONTRACTOR";
        onSupabaseLogin?.(assumedRole);
      } else {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (mode === "role") {
        handleRoleLogin();
      } else {
        handleEmailLogin();
      }
    }
  };

  const switchToRoleMode = () => {
    setMode("role");
    setEmail("");
    setPassword("");
    setError("");
  };

  const getEmailLoginTitle = () => {
    return authUserType === "manager" ? "Manager Login" : "Contractor Login";
  };

  const getEmailLoginHint = () => {
    return authUserType === "manager"
      ? "Sign in with your manager account credentials"
      : "Sign in with your contractor account credentials";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        {/* Login Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {/* App Title */}
          <h1 className="text-center text-xl font-semibold text-gray-900 mb-2">
            Invoicing Platform
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            {mode === "role" ? "Select your role to continue" : getEmailLoginTitle()}
          </p>

          {mode === "role" ? (
            /* Role-based login form */
            <div className="space-y-5">
              {/* Username Field */}
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-gray-900 mb-1.5 block">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Admin, Manager, or Contractor"
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field (visual only for Admin mock) */}
              <div>
                <Label htmlFor="password-role" className="text-sm font-medium text-gray-900 mb-1.5 block">
                  Password
                </Label>
                <Input
                  id="password-role"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter password"
                  className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                />
              </div>

              {/* Login Button */}
              <Button
                onClick={handleRoleLogin}
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 rounded-lg mt-2"
              >
                Log In
              </Button>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* Email/password login form for Manager/Contractor */
            <div className="space-y-5">
              {/* Back button */}
              <button
                onClick={switchToRoleMode}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                &larr; Back to role selection
              </button>

              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-900 mb-1.5 block">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="you@example.com"
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <Label htmlFor="password-email" className="text-sm font-medium text-gray-900 mb-1.5 block">
                  Password
                </Label>
                <Input
                  id="password-email"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                />
              </div>

              {/* Login Button */}
              <Button
                onClick={handleEmailLogin}
                disabled={loading}
                className={`w-full h-11 rounded-lg mt-2 ${
                  authUserType === "manager"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-center">
          {mode === "role" ? (
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Admin</span> (mock login)
              <br />
              <span className="font-medium text-gray-700">Manager</span> &{" "}
              <span className="font-medium text-gray-700">Contractor</span> (real authentication)
            </p>
          ) : (
            <p className="text-xs text-gray-500">{getEmailLoginHint()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
