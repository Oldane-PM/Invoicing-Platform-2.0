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
import { Loader2, FolderPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { ProjectRow, CreateProjectInput, UpdateProjectInput } from "../../lib/types";

type DialogMode = "create" | "edit";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  initialValues?: ProjectRow | null;
  onSubmit: (input: CreateProjectInput | UpdateProjectInput) => Promise<void>;
  submitting: boolean;
}

export function ProjectDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  submitting,
}: ProjectDialogProps) {
  const [name, setName] = React.useState("");
  const [client, setClient] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [resourceCount, setResourceCount] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const isEditMode = mode === "edit";

  // Reset form when dialog opens or initialValues change
  React.useEffect(() => {
    if (open) {
      if (isEditMode && initialValues) {
        setName(initialValues.name);
        setClient(initialValues.client);
        setDescription(initialValues.description ?? "");
        setStartDate(initialValues.startDate);
        setEndDate(initialValues.endDate ?? "");
        setResourceCount(String(initialValues.resourceCount));
      } else {
        setName("");
        setClient("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        setResourceCount("");
      }
      setErrors({});
    }
  }, [open, isEditMode, initialValues]);

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
      if (isEditMode && initialValues) {
        // Update mode
        const updateInput: UpdateProjectInput = {
          id: initialValues.id,
          name: name.trim(),
          client: client.trim(),
          description: description.trim() || null,
          startDate,
          endDate: endDate || null,
          resourceCount: resourceCount ? Number(resourceCount) : 0,
        };
        await onSubmit(updateInput);
        toast.success("Project updated successfully");
      } else {
        // Create mode
        const createInput: CreateProjectInput = {
          name: name.trim(),
          client: client.trim(),
          description: description.trim() || null,
          startDate,
          endDate: endDate || null,
          resourceCount: resourceCount ? Number(resourceCount) : 0,
        };
        await onSubmit(createInput);
        toast.success("Project created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${isEditMode ? "update" : "create"} project`;
      toast.error(message);
    }
  };

  const dialogTitle = isEditMode ? "Edit Project" : "Add Project";
  const dialogDescription = isEditMode
    ? "Update the project details below."
    : "Create a new project to track work and resources.";
  const submitButtonText = isEditMode ? "Save Changes" : "Create Project";
  const submittingText = isEditMode ? "Saving..." : "Creating...";
  const Icon = isEditMode ? Pencil : FolderPlus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="project-dialog-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-purple-600" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription id="project-dialog-description">
            {dialogDescription}
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
                  {submittingText}
                </>
              ) : (
                <>
                  <Icon className="w-4 h-4 mr-2" />
                  {submitButtonText}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
