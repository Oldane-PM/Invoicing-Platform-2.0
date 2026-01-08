import SignIn from "../components/sign-in";

export function Login() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h1 className="text-center text-xl font-semibold text-gray-900 mb-6">
            Invoicing Platform
          </h1>

          {/* ✅ THIS is what you were missing */}
          <SignIn />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo usernames:{" "}
            <span className="font-medium text-gray-700">Admin</span>,{" "}
            <span className="font-medium text-gray-700">Manager</span>, or{" "}
            <span className="font-medium text-gray-700">Contractor</span>
          </p>
        </div>
      </div>
    </div>
  );
}
