import * as React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AlertCircle } from "lucide-react";

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleLogin = () => {
    setError("");

    if (username === "Admin" || username === "Manager" || username === "Contractor") {
      onLogin(username);
    } else {
      setError("Invalid username");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        {/* Login Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {/* App Title */}
          <h1 className="text-center text-xl font-semibold text-gray-900 mb-8">
            Invoicing Platform
          </h1>

          {/* Form Fields */}
          <div className="space-y-5">
            {/* Username Field */}
            <div>
              <Label htmlFor="username" className="text-sm font-medium text-gray-900 mb-1.5 block">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter username"
                className="h-11 bg-gray-50 border-gray-200 rounded-lg"
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-900 mb-1.5 block">
                Password
              </Label>
              <Input
                id="password"
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
              onClick={handleLogin}
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
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo usernames: <span className="font-medium text-gray-700">Admin</span>,{" "}
            <span className="font-medium text-gray-700">Manager</span>, or{" "}
            <span className="font-medium text-gray-700">Contractor</span>
          </p>
        </div>
      </div>
    </div>
  );
}