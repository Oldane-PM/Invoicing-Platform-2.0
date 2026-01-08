import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, UserPlus, Loader2, Users, AlertCircle } from "lucide-react";
import type { AvailableContractor } from "../lib/supabase/repos/team.repo";

interface AddContractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableContractors: AvailableContractor[];
  loading: boolean;
  error: Error | null;
  adding: boolean;
  onSearch: (query: string) => void;
  onFetchAll: () => void;
  onAdd: (contractorId: string) => Promise<boolean>;
}

export function AddContractorDialog({
  open,
  onOpenChange,
  availableContractors,
  loading,
  error,
  adding,
  onSearch,
  onFetchAll,
  onAdd,
}: AddContractorDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [addingId, setAddingId] = React.useState<string | null>(null);

  // Fetch available contractors when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      onFetchAll();
    }
  }, [open, onFetchAll]);

  // Debounced search
  React.useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        onSearch(searchQuery);
      } else {
        onFetchAll();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, onSearch, onFetchAll]);

  const handleAdd = async (contractor: AvailableContractor) => {
    setAddingId(contractor.id);
    const success = await onAdd(contractor.id);
    setAddingId(null);

    if (success) {
      // Contractor was added, list will refresh automatically
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Add Contractor to Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-gray-50 border-gray-200 rounded-lg"
              autoFocus
            />
          </div>

          {/* Contractors List */}
          <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading contractors...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-sm text-red-600 text-center">
                  {error.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFetchAll}
                  className="mt-3"
                >
                  Retry
                </Button>
              </div>
            ) : availableContractors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Users className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  {searchQuery
                    ? "No contractors found matching your search"
                    : "No contractors available to add"}
                </p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {searchQuery
                    ? "Try a different search term"
                    : "All contractors are already in your team"}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {availableContractors.map((contractor) => (
                  <li
                    key={contractor.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {contractor.fullName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {contractor.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAdd(contractor)}
                      disabled={adding || addingId === contractor.id}
                      className="ml-3 bg-blue-600 hover:bg-blue-700"
                    >
                      {addingId === contractor.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-200"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
