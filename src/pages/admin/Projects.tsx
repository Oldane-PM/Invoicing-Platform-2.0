import * as React from "react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { AddProjectDialog } from "../../components/modals/AddProjectDialog";
import { useProjects } from "../../lib/hooks/admin/useProjects";
import { format } from "date-fns";
import { Search, FolderPlus, AlertCircle, FolderOpen } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import type { CreateProjectInput } from "../../lib/types";

type SortField = "name" | "client" | "start_date" | "created_at";

export function AdminProjects() {
  const {
    rows: projects,
    isLoading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    refetch,
    createProject,
    creating,
  } = useProjects();

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const handleCreateProject = async (input: CreateProjectInput) => {
    await createProject(input);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const truncateDescription = (desc: string | null, maxLength = 50) => {
    if (!desc) return "-";
    if (desc.length <= maxLength) return desc;
    return desc.slice(0, maxLength) + "...";
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load projects. {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Add Button */}
      <Card className="p-4 border border-gray-200 rounded-[14px] bg-white">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by project name or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 h-11"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
      </Card>

      {/* Projects Table */}
      <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Project Name
                  {sortBy === "name" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("client")}
                >
                  Client
                  {sortBy === "client" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Description
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium text-center">
                  # Resources
                </TableHead>
                <TableHead
                  className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("start_date")}
                >
                  Start Date
                  {sortBy === "start_date" && (
                    <span className="ml-2">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  End Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                      <div className="text-gray-600 font-medium mt-3">
                        Loading projects...
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FolderOpen className="w-16 h-16 mb-3" strokeWidth={1.5} />
                      <div className="text-gray-600 font-medium">
                        No projects yet
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {search
                          ? "Try adjusting your search"
                          : "Create your first project to get started"}
                      </div>
                      {!search && (
                        <Button
                          onClick={() => setDialogOpen(true)}
                          className="mt-4 bg-purple-600 hover:bg-purple-700"
                        >
                          <FolderPlus className="w-4 h-4 mr-2" />
                          Add Project
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="h-16 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {project.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {project.client}
                    </TableCell>
                    <TableCell className="text-gray-600 max-w-[200px]">
                      <span title={project.description || undefined}>
                        {truncateDescription(project.description)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      {project.resourceCount}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDate(project.startDate)}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDate(project.endDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Project Dialog */}
      <AddProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateProject}
        submitting={creating}
      />
    </div>
  );
}
