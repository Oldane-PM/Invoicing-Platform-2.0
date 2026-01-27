import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { AlertCircle, Loader2, Mail, Lock, Shield, Users, Briefcase } from "lucide-react";
import type { UserRole } from "../../lib/supabase/repos/auth.repo";

type RoleOption = "admin" | "manager" | "contractor";

interface LoginProps {
  onSupabaseLogin: (role: UserRole) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  authLoading?: boolean;
}

export function Login({ onSupabaseLogin, signIn, authLoading }: LoginProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<RoleOption | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const hasDisabledErrorRef = React.useRef(false);

  // Debug: Log when error changes
  React.useEffect(() => {
    console.log('[Login] Error state changed to:', error);
    // If error contains "disabled", mark it so we don't clear it
    if (error.includes('disabled')) {
      hasDisabledErrorRef.current = true;
    }
  }, [error]);

  const handleLogin = async () => {
    // Don't clear error if it's a disabled account error
    if (!hasDisabledErrorRef.current) {
      // Error will be set/cleared as needed below
    }

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    if (!hasDisabledErrorRef.current) {
      setError(""); // Clear error only when starting actual login attempt
    }

    // Store login intent in sessionStorage so App.tsx can validate it
    if (selectedRole) {
      sessionStorage.setItem('loginIntent', selectedRole);
    }

    try {
      const result = await signIn(email, password);
      console.log('[Login] signIn result:', result);

      if (result.success && result.role) {
        // Route based on profile role from Supabase
        onSupabaseLogin(result.role);
      } else if (result.success && !result.role) {
        // Logged in but no profile - this shouldn't happen in production
        setError("Account found but no role assigned. Please contact an administrator.");
        setLoading(false);
      } else {
        console.log('[Login] Setting error:', result.error);
        setError(result.error || "Login failed. Please check your credentials.");
        sessionStorage.removeItem('loginIntent');
        setLoading(false);
      }
    } catch (err) {
      console.error('[Login] Exception:', err);
      setError("An unexpected error occurred. Please try again.");
      sessionStorage.removeItem('loginIntent');
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  const roleCards: { key: RoleOption; label: string; icon: React.ReactNode; color: string }[] = [
    {
      key: "admin",
      label: "Admin",
      icon: <Shield className="w-5 h-5" />,
      color: "purple",
    },
    {
      key: "manager",
      label: "Manager",
      icon: <Users className="w-5 h-5" />,
      color: "blue",
    },
    {
      key: "contractor",
      label: "Contractor",
      icon: <Briefcase className="w-5 h-5" />,
      color: "green",
    },
  ];

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
      <div className="w-full max-w-[400px]">
        {/* Login Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {/* App Title */}
          <h1 className="text-center text-xl font-semibold text-gray-900 mb-2">
            Invoicing Platform
          </h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            Enter credentials and select your role
          </p>

          <div className="space-y-5">
            {/* Role Selection Cards */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 mb-1.5 block">
                Select Role
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {roleCards.map((role) => {
                  const isSelected = selectedRole === role.key;
                  const colorClasses = {
                    purple: isSelected
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 hover:border-purple-200 hover:bg-purple-50/50",
                    blue: isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/50",
                    green: isSelected
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-green-200 hover:bg-green-50/50",
                  };

                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => setSelectedRole(role.key)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        colorClasses[role.color as keyof typeof colorClasses]
                      }`}
                    >
                      <div className={isSelected ? "" : "text-gray-500"}>
                        {role.icon}
                      </div>
                      <span className={`text-xs font-medium mt-1 ${isSelected ? "" : "text-gray-600"}`}>
                        {role.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Username (Email) Field */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-900 mb-1.5 block">
                Username
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
              <Label htmlFor="password" className="text-sm font-medium text-gray-900 mb-1.5 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                  className="h-11 bg-gray-50 border-gray-200 rounded-lg pl-10"
                />
              </div>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-11 bg-purple-600 hover:bg-purple-700 rounded-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Log In"
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
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Sign in with your assigned email and password.
            <br />
            Your portal access is determined by your account role.
          </p>
        </div>
      </div>
    </div>
  );
}
