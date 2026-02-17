import * as React from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "../../lib/auth-client";
import { getSupabaseClient } from "../../lib/supabase/client";

interface OAuthCallbackProps {
  onAuthComplete: (role: string) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  please_restart_the_process: "Sign-in was interrupted or the session expired. Please try again from the login page.",
  state_mismatch: "Sign-in session expired. Please try again from the login page.",
};

export function OAuthCallback({ onAuthComplete }: OAuthCallbackProps) {
  const [error, setError] = React.useState<string | null>(null);
  const { data: session, isPending } = useSession();
  const hasProcessed = React.useRef(false); // Prevent multiple executions

  // Show error from URL (e.g. redirect from backend with ?error=please_restart_the_process)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam] || "Sign-in failed. Please try again from the login page.");
    }
  }, []);

  React.useEffect(() => {
    async function handleCallback() {
      try {
        // If backend redirected here with ?error=, we already showed it; don't overwrite
        if (new URLSearchParams(window.location.search).get("error")) {
          return;
        }

        console.log("[OAuth Callback] Processing OAuth callback...");

        // Prevent multiple executions
        if (hasProcessed.current) {
          console.log("[OAuth Callback] Already processed, skipping");
          return;
        }

        // Wait for Better Auth session
        if (isPending) {
          console.log("[OAuth Callback] Waiting for session...");
          return;
        }

        if (!session || !session.user) {
          console.error("[OAuth Callback] No session found");
          setError("Authentication failed. No session found.");
          return;
        }

        // Mark as processing to prevent duplicate calls
        hasProcessed.current = true;
        console.log("[OAuth Callback] Better Auth session found:", session.user.email);

        // Call backend to create Supabase session
        const apiBase = import.meta.env.VITE_AUTH_BASE_URL || "http://localhost:5001";
        const response = await fetch(`${apiBase}/api/callback/supabase`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for Better Auth session
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[OAuth Callback] Server error:", errorData);
          setError(errorData.error || "Failed to create session");
          return;
        }

        const data = await response.json();
        console.log("[OAuth Callback] Supabase session created:", data.user);

        // Set Supabase session using the magic link token
        const supabase = getSupabaseClient();
        const { error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: data.session.token,
          type: 'magiclink',
        });

        if (sessionError) {
          console.error("[OAuth Callback] Error verifying OTP:", sessionError);
          setError("Failed to verify session");
          return;
        }

        console.log("[OAuth Callback] Session verified successfully, role:", data.user.role);

        // Map role to uppercase for App.tsx
        const roleMap: Record<string, string> = {
          'admin': 'ADMIN',
          'manager': 'MANAGER',
          'contractor': 'CONTRACTOR',
          'unassigned': 'UNASSIGNED',
        };

        const appRole = roleMap[data.user.role.toLowerCase()] || 'UNASSIGNED';
        
        // Call onAuthComplete with the role
        onAuthComplete(appRole);

      } catch (err) {
        console.error("[OAuth Callback] Unexpected error:", err);
        setError("An unexpected error occurred");
      }
    }

    handleCallback();
  }, [session, isPending, onAuthComplete]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mb-4 text-red-600">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Completing sign-in...
        </h1>
        <p className="text-gray-600">
          Please wait while we set up your session
        </p>
      </div>
    </div>
  );
}
