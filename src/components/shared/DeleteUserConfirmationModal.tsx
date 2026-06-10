/**
 * DeleteUserConfirmationModal
 * 
 * Confirmation dialog for deleting a user. Shows a warning with user details
 * and requires explicit confirmation before proceeding.
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
import { Trash2 } from "lucide-react";

interface DeleteUserConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userEmail: string;
  userRole: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteUserConfirmationModal({
  open,
  onOpenChange,
  userName,
  userEmail,
  userRole,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteUserConfirmationModalProps) {
  const [confirmText, setConfirmText] = React.useState("");

  // Reset confirm text when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (confirmText !== "DELETE") {
      return;
    }
    onConfirm();
  };

  const handleCancel = () => {
    setConfirmText("");
    onCancel();
  };

  const isConfirmDisabled = isLoading || confirmText !== "DELETE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <span className="text-red-600">Delete User</span>
          </DialogTitle>
          <DialogDescription className="pt-2">
            You are about to permanently delete this user from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* User info card */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-sm text-gray-600">{userEmail}</p>
              <p className="text-xs text-gray-500">
                Role: <span className="font-medium">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. The user will be removed from 
              all tables including their profile, access records, and any contractor records.
            </p>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              To confirm, type <strong>DELETE</strong> below:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className={
                confirmText !== "" && confirmText !== "DELETE"
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
              autoComplete="off"
              autoFocus
            />
            {confirmText !== "" && confirmText !== "DELETE" && (
              <p className="text-xs text-red-600">
                Please type DELETE exactly to proceed.
              </p>
            )}
          </div>
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
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
