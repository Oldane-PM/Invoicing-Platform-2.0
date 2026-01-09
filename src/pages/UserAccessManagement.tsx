
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Combobox } from "./Combobox";
import { Switch } from "../components/ui/switch";
import { ShieldAlert, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  useUserAccessUsers,
  useUpdateUserRole,
  useSetUserEnabled,
  useCurrentUserId,
} from "../lib/hooks/userAccess";
import type { UserRole } from "../lib/data/userAccess";

export function UserAccessManagement() {
  // Fetch data and current user
  const { data: users, isLoading, error, refetch } = useUserAccessUsers();
  const currentUserId = useCurrentUserId();
  
  // Mutations
  const updateRole = useUpdateUserRole();
  const setEnabled = useSetUserEnabled();

  const handleRoleChange = (userId: string, userName: string, newRole: string) => {
    updateRole.mutate({
      userId,
      role: newRole.toLowerCase() as UserRole,
      userName,
    });
  };

  const handleToggleAccess = (userId: string, userName: string, enabled: boolean) => {
    setEnabled.mutate({
      userId,
      isActive: enabled,
      userName,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
          <div className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading users...</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    const isAccessDenied = error.message?.includes('permission') || 
                          error.message?.includes('policy') ||
                          error.message?.includes('RLS');

    return (
      <div className="space-y-6">
        <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {isAccessDenied ? 'Access Denied' : 'Error Loading Users'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {isAccessDenied
                    ? 'You do not have permission to view user access management.'
                    : 'An error occurred while loading users. Please try again.'}
                </p>
                {!isAccessDenied && (
                  <Button onClick={() => refetch()} variant="outline">
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!users || users.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
          <div className="p-8 text-center text-gray-600">
            No users found
          </div>
        </Card>
      </div>
    );
  }

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
                      !user.isActive ? "opacity-60" : ""
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.fullName}</span>
                        {isCurrentUser && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                            You
                          </span>
                        )}
                        {!user.isActive && (
                          <Lock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{user.email}</TableCell>
                    <TableCell>
                      <Combobox
                        value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, user.fullName, value)
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
                          checked={user.isActive}
                          onCheckedChange={(checked) =>
                            handleToggleAccess(user.id, user.fullName, checked)
                          }
                          disabled={isCurrentUser && user.isActive}
                          className="data-[state=checked]:bg-green-500"
                        />
                        {isCurrentUser && user.isActive && (
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
