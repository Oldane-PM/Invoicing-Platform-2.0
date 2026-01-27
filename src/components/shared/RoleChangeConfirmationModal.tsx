/**
 * RoleChangeConfirmationModal
 * 
 * Confirmation dialog for role changes with special handling for admin self-protection.
 * Requires typing "CONFIRM" when an admin is about to lose admin access.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { UserRole } from "../../lib/data/userAccess";

interface RoleChangeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  currentRole: UserRole;
  pendingRole: UserRole;
  isCurrentUser: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function capitalizeRole(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function RoleChangeConfirmationModal({
  open,
  onOpenChange,
  userName,
  currentRole,
  pendingRole,
  isCurrentUser,
  onConfirm,
  onCancel,
  isLoading = false,
}: RoleChangeConfirmationModalProps) {
  const [confirmText, setConfirmText] = React.useState("");

  // Determine if this is an admin self-lockout scenario
  const isAdminSelfLockout = 
    isCurrentUser && 
    currentRole === "admin" && 
    pendingRole !== "admin";

  // Reset confirm text when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (isAdminSelfLockout && confirmText !== "CONFIRM") {
      return;
    }
    onConfirm();
  };

  const handleCancel = () => {
    setConfirmText("");
    onCancel();
  };

  const isConfirmDisabled = 
    isLoading || 
    (isAdminSelfLockout && confirmText !== "CONFIRM");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdminSelfLockout ? (
              <>
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span className="text-red-600">Critical: Admin Self-Lockout</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Confirm Role Change</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {isAdminSelfLockout ? (
              <span className="text-red-600 font-medium">
                Warning: You are about to remove your own admin access. 
                You may lose the ability to access the Admin Portal.
              </span>
            ) : (
              <>
                You're changing <strong>{userName}</strong> from{" "}
                <strong>{capitalizeRole(currentRole)}</strong> to{" "}
                <strong>{capitalizeRole(pendingRole)}</strong>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            This will affect what they can access and which dashboard they see.
          </p>

          {isAdminSelfLockout && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  To confirm this action, type <strong>CONFIRM</strong> below:
                </p>
              </div>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM"
                className={
                  confirmText !== "" && confirmText !== "CONFIRM"
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                autoComplete="off"
                autoFocus
              />
              {confirmText !== "" && confirmText !== "CONFIRM" && (
                <p className="text-xs text-red-600">
                  Please type CONFIRM exactly to proceed.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={
              isAdminSelfLockout
                ? "bg-red-600 hover:bg-red-700 text-white"
                : ""
            }
          >
            {isLoading ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
