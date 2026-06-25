import * as React from "react";
import { Button } from "../../components/ui/button";
import {
  Loader2,
  ShieldCheck,
  Zap,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { signIn } from "../../lib/auth-client";

interface LoginProps {
  authLoading?: boolean;
}

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
        },
      );
    } catch (err) {
      console.error("[Login] Google sign-in error:", err);
      setError("An error occurred during sign-in. Please try again.");
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#00529B] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Branding & Visuals */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#00529B] to-[#003A70] relative overflow-hidden items-center justify-center p-12">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="bg-white p-2.5 rounded-2xl inline-block mb-10 shadow-sm">
            <img
              src="/intellibus-logo.png"
              alt="Intellibus"
              className="h-10 object-contain"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Intelligent Invoicing <br />
            <span className="text-blue-200">Simplified.</span>
          </h1>
          <p className="text-lg text-blue-100 mb-12 leading-relaxed">
            Manage your contracts, submit hours seamlessly, and track your work
            orders all in one secure platform.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl shadow-sm backdrop-blur-sm">
                <Zap className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">
                  Lightning Fast
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Submit your hours and get approved faster than ever before.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl shadow-sm backdrop-blur-sm">
                <ShieldCheck className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">
                  Enterprise Security
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Your data and financial information are fully protected.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-xl shadow-sm backdrop-blur-sm">
                <BarChart3 className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">
                  Real-time Tracking
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Keep an eye on your invoices and contract status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 lg:bg-white relative">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-center">
            {/* Mobile Logo Only */}
            <div className="flex justify-center mb-6 lg:hidden">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-100 inline-block">
                <img src="/intellibus-logo.png" alt="Intellibus" className="h-8 object-contain" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Invoicing Platform
            </h2>
            <p className="text-slate-500 mt-3 text-sm lg:text-base">
              Welcome back. Sign in to access your portal.
            </p>
          </div>

          <div className="bg-white lg:bg-transparent rounded-2xl lg:rounded-none p-8 lg:p-0 shadow-sm border border-slate-200 lg:border-none lg:shadow-none">
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="outline"
              className="w-full h-12 text-base font-medium bg-white border-slate-300 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center gap-3 transition-all duration-200 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  <span>Connecting...</span>
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
                  <span>Sign in with Google</span>
                </>
              )}
            </Button>

            {error && (
              <div className="mt-5 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium leading-tight">
                  {error}
                </p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-xs text-center text-slate-500 leading-relaxed">
                By signing in, you agree to the Intellibus Invoicing Platform
                terms. Your portal access is determined automatically by your
                organizational role.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
