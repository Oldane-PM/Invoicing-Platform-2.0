import * as React from "react";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { User, UserRole } from "../types";
import { Combobox } from "./Combobox";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { ShieldAlert, Lock } from "lucide-react";

interface UserAccessManagementProps {
  users: User[];
  currentUserId: string;
  onUserUpdate: (user: User) => void;
}

export function UserAccessManagement({
  users,
  currentUserId,
  onUserUpdate,
}: UserAccessManagementProps) {
  const handleRoleChange = (user: User, newRole: UserRole) => {
    const updatedUser = { ...user, role: newRole };
    onUserUpdate(updatedUser);
    toast.success(`Role updated to ${newRole} for ${user.name}`);
  };

  const handleToggleAccess = (user: User, enabled: boolean) => {
    // Prevent admin from disabling themselves
    if (user.id === currentUserId && !enabled) {
      toast.error("You cannot disable your own account");
      return;
    }

    const updatedUser = { ...user, enabled };
    onUserUpdate(updatedUser);

    if (enabled) {
      toast.success(`Access enabled for ${user.name}`);
    } else {
      toast("Access disabled for " + user.name, {
        description: "User will no longer be able to access the platform",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  User
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Email Address
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Role
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Enable
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;

                return (
                  <TableRow
                    key={user.id}
                    className={`h-16 border-b border-gray-100 last:border-0 ${
                      !user.enabled ? "opacity-60" : ""
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        {isCurrentUser && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                            You
                          </span>
                        )}
                        {!user.enabled && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <Combobox
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user, value as UserRole)
                        }
                        options={[
                          { value: "Contractor", label: "Contractor" },
                          { value: "Manager", label: "Manager" },
                          { value: "Admin", label: "Admin" },
                        ]}
                        placeholder="Select role"
                        className="w-48"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={user.enabled}
                          onCheckedChange={(checked) =>
                            handleToggleAccess(user, checked)
                          }
                          disabled={isCurrentUser && user.enabled}
                          className="data-[state=checked]:bg-green-500"
                        />
                        {isCurrentUser && user.enabled && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Cannot disable yourself</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
