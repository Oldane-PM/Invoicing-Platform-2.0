import * as React from "react";
import { Button } from "../../components/ui/button";
import { Loader2 } from "lucide-react";
// Import for better-auth (commented out)
// import { signIn } from "../../lib/auth-client";

interface LoginProps {
  authLoading?: boolean;
  onDemoLogin?: (role: string) => Promise<{ ok: boolean; error?: string }>;
}

/* 
=========================================================
BETTER-AUTH LOGIN (COMMENTED OUT FOR DEMO MODE)
=========================================================

export function Login({ authLoading }: LoginProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      await signIn.social(
        {
          provider: "google",
          callbackURL: `${window.location.origin}/auth/callback`,
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onResponse: () => {
            setLoading(false);
          },
          onError: (ctx) => {
            console.error("[Login] Google sign-in error:", ctx.error);
            setError("Failed to sign in with Google. Please try again.");
            setLoading(false);
          },
        }
      );
    } catch (err) {
      console.error("[Login] Google sign-in error:", err);
      setError("An error occurred during sign-in. Please try again.");
      setLoading(false);
    }
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
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Sign In
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Sign in with your Google account to access the platform
          </p>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full h-11 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium">Sign in with Google</span>
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4 text-red-600 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Sign in with your Google account to access the platform.
            <br />
            Your portal access is determined by your account role.
          </p>
        </div>
      </div>
    </div>
  );
}
*/

export function Login({ authLoading, onDemoLogin }: LoginProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!onDemoLogin) {
      setError("Demo login handler is not provided.");
      return;
    }

    const lowerUser = username.toLowerCase().trim();
    if (!["admin", "manager", "contractor"].includes(lowerUser)) {
      setError("Invalid username. Try Admin, Manager, or Contractor.");
      return;
    }

    setLoading(true);
    const result = await onDemoLogin(lowerUser);
    // On success the app navigates away; only handle the failure case here.
    if (!result.ok) {
      setError(result.error || "Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 flex-col">
      <div className="w-full max-w-[420px]">
        {/* Login Card */}
        <div className="bg-white rounded-[24px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Invoicing Platform
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Username
              </label>
              <input
                type="text"
                placeholder="Enter username"
                className="w-full h-12 px-4 rounded-xl border border-blue-200 bg-[#F8FAFC] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-[#F8FAFC] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#9B1CFF] hover:bg-[#8614E0] text-white rounded-xl font-medium mt-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </div>

        {/* Demo Credentials Hint */}
        <div className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-xs font-semibold text-gray-700 mb-2 text-center">
            Demo Credentials
          </p>
          <div className="space-y-1.5">
            {[
              { username: "Admin", email: "admin@demo.local" },
              { username: "Manager", email: "manager@demo.local" },
              { username: "Contractor", email: "contractor@demo.local" },
            ].map((u) => (
              <div
                key={u.username}
                className="flex items-center justify-between text-sm gap-3"
              >
                <span className="font-semibold text-gray-800">{u.username}</span>
                <span className="text-gray-500 truncate">{u.email}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Password: <span className="font-semibold text-gray-700">Demo123!</span>
          </p>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Type a username (e.g. <span className="font-medium">Contractor</span>) above to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
