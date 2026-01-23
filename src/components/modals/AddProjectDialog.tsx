import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import type { CreateProjectInput } from "../../lib/types";

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
  submitting: boolean;
}

export function AddProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: AddProjectDialogProps) {
  const [name, setName] = React.useState("");
  const [client, setClient] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [resourceCount, setResourceCount] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName("");
      setClient("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setResourceCount("");
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Project name is required";
    }

    if (!client.trim()) {
      newErrors.client = "Client is required";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = "End date must be after start date";
    }

    if (resourceCount && (isNaN(Number(resourceCount)) || Number(resourceCount) < 0)) {
      newErrors.resourceCount = "Resource count must be a non-negative number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        client: client.trim(),
        description: description.trim() || null,
        startDate,
        endDate: endDate || null,
        resourceCount: resourceCount ? Number(resourceCount) : 0,
      });

      toast.success("Project created successfully");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create project";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="add-project-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-purple-600" />
            Add Project
          </DialogTitle>
          <DialogDescription id="add-project-description">
            Create a new project to track work and resources.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="project-name"
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "border-red-500" : ""}
              autoFocus
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Client */}
          <div>
            <label htmlFor="project-client" className="block text-sm font-medium text-gray-700 mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <Input
              id="project-client"
              placeholder="Enter client name"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className={errors.client ? "border-red-500" : ""}
            />
            {errors.client && <p className="text-sm text-red-500 mt-1">{errors.client}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="project-description"
              placeholder="Enter project description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="project-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="project-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={errors.startDate ? "border-red-500" : ""}
              />
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label htmlFor="project-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                id="project-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={errors.endDate ? "border-red-500" : ""}
              />
              {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Resource Count */}
          <div>
            <label htmlFor="project-resources" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Resources
            </label>
            <Input
              id="project-resources"
              type="number"
              min="0"
              placeholder="0"
              value={resourceCount}
              onChange={(e) => setResourceCount(e.target.value)}
              className={errors.resourceCount ? "border-red-500" : ""}
            />
            {errors.resourceCount && <p className="text-sm text-red-500 mt-1">{errors.resourceCount}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
