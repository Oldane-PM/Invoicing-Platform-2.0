
import * as React from "react";
import { Card } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Combobox } from "../../components/shared/Combobox";
import { Switch } from "../../components/ui/switch";
import { ShieldAlert, Lock, Loader2, AlertCircle, UserX, UserPlus, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  useUserAccessUsers,
  useUpdateUserRole,
  useSetUserEnabled,
  useCurrentUserId,
} from "../../lib/hooks/userAccess";
import { RoleChangeConfirmationModal } from "../../components/shared/RoleChangeConfirmationModal";
import { NewUserModal } from "../../components/modals/NewUserModal";
import { SuccessModal } from "../../components/modals/SuccessModal";
import type { UserRole } from "../../lib/data/userAccess";

// Role options in specified order
const ROLE_OPTIONS = [
  { value: "Unassigned", label: "Unassigned" },
  { value: "Contractor", label: "Contractor" },
  { value: "Manager", label: "Manager" },
  { value: "Admin", label: "Admin" },
];

interface PendingRoleChange {
  userId: string;
  userName: string;
  currentRole: UserRole;
  pendingRole: UserRole;
}

export function UserAccessManagement() {
  // Fetch data and current user
  const { data: users, isLoading, error, refetch } = useUserAccessUsers();
  const currentUserId = useCurrentUserId();
  
  // Mutations
  const updateRole = useUpdateUserRole();
  const setEnabled = useSetUserEnabled();

  // Pending role change state for confirmation modal
  const [pendingRoleChange, setPendingRoleChange] = React.useState<PendingRoleChange | null>(null);
  
  // Track temporary dropdown values before confirmation
  const [tempDropdownValues, setTempDropdownValues] = React.useState<Record<string, string>>({});

  // New user modal state
  const [newUserModalOpen, setNewUserModalOpen] = React.useState(false);
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);

  // Handle role dropdown change - opens confirmation modal instead of immediately persisting
  const handleRoleChange = (userId: string, userName: string, newRoleDisplay: string, currentRole: UserRole) => {
    const newRole = newRoleDisplay.toLowerCase() as UserRole;
    
    // Don't do anything if the role hasn't changed
    if (newRole === currentRole) {
      return;
    }

    // Set the pending change and open modal
    setPendingRoleChange({
      userId,
      userName,
      currentRole,
      pendingRole: newRole,
    });
    
    // Store the temp value so dropdown shows the pending selection
    setTempDropdownValues(prev => ({ ...prev, [userId]: newRoleDisplay }));
  };

  // Confirm role change - actually persist to database
  const handleConfirmRoleChange = () => {
    if (!pendingRoleChange) return;

    updateRole.mutate(
      {
        userId: pendingRoleChange.userId,
        role: pendingRoleChange.pendingRole,
        userName: pendingRoleChange.userName,
      },
      {
        onSuccess: () => {
          // Clear pending state on success
          setPendingRoleChange(null);
          setTempDropdownValues(prev => {
            const next = { ...prev };
            delete next[pendingRoleChange.userId];
            return next;
          });
        },
        onError: () => {
          // Revert dropdown on error
          setTempDropdownValues(prev => {
            const next = { ...prev };
            delete next[pendingRoleChange.userId];
            return next;
          });
          setPendingRoleChange(null);
        },
      }
    );
  };

  // Cancel role change - revert dropdown to current role
  const handleCancelRoleChange = () => {
    if (pendingRoleChange) {
      setTempDropdownValues(prev => {
        const next = { ...prev };
        delete next[pendingRoleChange.userId];
        return next;
      });
    }
    setPendingRoleChange(null);
  };

  const handleToggleAccess = (userId: string, userName: string, enabled: boolean) => {
    setEnabled.mutate({
      userId,
      isActive: enabled,
      userName,
    });
  };

  // Get display value for role dropdown (temp value or actual role)
  const getDropdownValue = (user: { id: string; role: UserRole }) => {
    const tempValue = tempDropdownValues[user.id];
    if (tempValue) return tempValue;
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  };

  // Handle successful user creation
  const handleUserCreated = () => {
    refetch(); // Refresh user list
    setSuccessModalOpen(true); // Show success modal
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
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with New User Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">User Access Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage user roles and access permissions</p>
          </div>
          <Button
            onClick={() => setNewUserModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 h-10 px-4 rounded-lg"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Pre-Register User
          </Button>
        </div>

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
                    Status
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
                  const isUnassigned = user.role === "unassigned";
                  const isPendingActivation = user.activatedAt === null;
                  const isInvitation = user.id.startsWith("invitation_");

                  return (
                    <TableRow
                      key={user.id}
                      className={`h-16 border-b border-gray-100 last:border-0 ${
                        !user.isActive ? "opacity-60" : ""
                      } ${isUnassigned ? "bg-amber-50/50" : ""} ${
                        isPendingActivation ? "bg-amber-50/30 border-l-4 border-l-amber-400" : ""
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
                          {isUnassigned && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium cursor-help">
                                  <UserX className="w-3 h-3" />
                                  Unassigned
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>User profile not created yet</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {!user.isActive && (
                            <Lock className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        {isPendingActivation ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium cursor-help">
                                <Clock className="w-3.5 h-3.5" />
                                Pending Activation
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isInvitation ? "User needs to sign in with Google" : "User hasn't logged in yet"}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isInvitation ? (
                          <span className="text-sm text-gray-400 italic">
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        ) : (
                          <Combobox
                            value={getDropdownValue(user)}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, user.fullName, value, user.role)
                            }
                            options={ROLE_OPTIONS}
                            placeholder="Select role"
                            className="w-48"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {isInvitation ? (
                          <span className="text-sm text-gray-400 italic">—</span>
                        ) : (
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
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Role Change Confirmation Modal */}
        {pendingRoleChange && (
          <RoleChangeConfirmationModal
            open={!!pendingRoleChange}
            onOpenChange={(open) => {
              if (!open) handleCancelRoleChange();
            }}
            userName={pendingRoleChange.userName}
            currentRole={pendingRoleChange.currentRole}
            pendingRole={pendingRoleChange.pendingRole}
            isCurrentUser={pendingRoleChange.userId === currentUserId}
            onConfirm={handleConfirmRoleChange}
            onCancel={handleCancelRoleChange}
            isLoading={updateRole.isPending}
          />
        )}

        {/* New User Modal */}
        <NewUserModal
          open={newUserModalOpen}
          onOpenChange={setNewUserModalOpen}
          onSuccess={handleUserCreated}
        />

        {/* Success Modal */}
        <SuccessModal
          open={successModalOpen}
          onOpenChange={setSuccessModalOpen}
          title="User Pre-Registered!"
          message="The user will be assigned their role when they sign in with Google"
        />
      </div>
    </TooltipProvider>
  );
}
