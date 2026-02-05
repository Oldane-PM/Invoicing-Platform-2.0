/**
 * ProjectAssignmentsDialog
 *
 * Dialog for managing project manager and contractor assignments.
 * Admin-only component.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Loader2, X, UserPlus, Users, User } from "lucide-react";
import { toast } from "sonner";
import { useProjectAssignments } from "../../lib/hooks/admin/useProjectAssignments";
import type { ProjectRow } from "../../lib/types";

interface ProjectAssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRow | null;
}

export function ProjectAssignmentsDialog({
  open,
  onOpenChange,
  project,
}: ProjectAssignmentsDialogProps) {
  const [selectedContractor, setSelectedContractor] = React.useState<string>("");
  const [selectedManager, setSelectedManager] = React.useState<string>("");

  const {
    contractors,
    contractorsLoading,
    availableContractors,
    availableContractorsLoading,
    manager,
    managerLoading,
    availableManagers,
    availableManagersLoading,
    assignContractor,
    removeContractor,
    assignManager,
    removeManager,
    assigning,
    removing,
    assigningManager,
    removingManager,
  } = useProjectAssignments(project?.id || "");

  // Reset selections when dialog opens with a new project
  React.useEffect(() => {
    if (open && project) {
      setSelectedContractor("");
      setSelectedManager("");
    }
  }, [open, project?.id]);

  const handleAssignContractor = async () => {
    if (!selectedContractor) return;
    
    try {
      await assignContractor(selectedContractor);
      setSelectedContractor("");
      toast.success("Contractor assigned to project");
    } catch (error) {
      toast.error("Failed to assign contractor");
    }
  };

  const handleRemoveContractor = async (contractorId: string) => {
    try {
      await removeContractor(contractorId);
      toast.success("Contractor removed from project");
    } catch (error) {
      toast.error("Failed to remove contractor");
    }
  };

  const handleAssignManager = async () => {
    if (!selectedManager) return;
    
    try {
      await assignManager(selectedManager);
      setSelectedManager("");
      toast.success("Manager assigned to project");
    } catch (error) {
      toast.error("Failed to assign manager");
    }
  };

  const handleRemoveManager = async () => {
    try {
      await removeManager();
      toast.success("Manager removed from project");
    } catch (error) {
      toast.error("Failed to remove manager");
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Assignments
          </DialogTitle>
          <DialogDescription>
            Assign a manager and contractors to <strong>{project.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Manager Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Project Manager
            </Label>
            
            {managerLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading manager...
              </div>
            ) : manager ? (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <div className="font-medium text-gray-900">{manager.fullName}</div>
                  <div className="text-sm text-gray-500">{manager.email}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveManager}
                  disabled={removingManager}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {removingManager ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={selectedManager}
                  onValueChange={setSelectedManager}
                  disabled={availableManagersLoading}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableManagers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName} ({m.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignManager}
                  disabled={!selectedManager || assigningManager}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {assigningManager ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Assign"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Contractors Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Assigned Contractors
            </Label>

            {/* Add Contractor */}
            <div className="flex gap-2">
              <Select
                value={selectedContractor}
                onValueChange={setSelectedContractor}
                disabled={availableContractorsLoading}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a contractor to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableContractors.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-gray-500 text-center">
                      No available contractors
                    </div>
                  ) : (
                    availableContractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName} ({c.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignContractor}
                disabled={!selectedContractor || assigning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Assigned Contractors List */}
            {contractorsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading contractors...
              </div>
            ) : contractors.length === 0 ? (
              <div className="text-sm text-gray-500 italic py-2">
                No contractors assigned to this project yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {contractors.map((contractor) => (
                  <div
                    key={contractor.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {contractor.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{contractor.fullName}</div>
                        <div className="text-sm text-gray-500">{contractor.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContractor(contractor.id)}
                      disabled={removing}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {removing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              {contractors.length} contractor{contractors.length !== 1 ? "s" : ""}
            </Badge>
            {manager && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Manager assigned
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
