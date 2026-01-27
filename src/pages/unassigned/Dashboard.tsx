/**
 * Unassigned User Dashboard
 * 
 * Shown to users who have logged in but haven't been assigned a role yet.
 * Provides clear messaging and options to logout or refresh status.
 */

import * as React from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { UserX, LogOut, RefreshCw, Loader2 } from "lucide-react";

interface UnassignedDashboardProps {
  onLogout: () => void;
  onRefreshStatus: () => void;
  isRefreshing?: boolean;
}

export function UnassignedDashboard({
  onLogout,
  onRefreshStatus,
  isRefreshing = false,
}: UnassignedDashboardProps) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border border-gray-200 rounded-[14px] bg-white overflow-hidden">
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <UserX className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Profile Not Created
          </h1>

          {/* Main Message */}
          <p className="text-gray-600 text-center mb-6">
            Your account has not been fully set up yet.
            Please reach out to your administrator to complete your profile and assign access.
          </p>

          {/* Helper Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 text-center">
              Once your role is assigned, you'll be redirected to the appropriate dashboard automatically.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={onRefreshStatus}
              disabled={isRefreshing}
              variant="outline"
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking status...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>

            <Button
              onClick={onLogout}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
