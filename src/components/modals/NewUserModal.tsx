import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Combobox } from "../shared/Combobox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../ui/calendar";
import { toast } from "sonner";

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: "Unassigned", label: "Unassigned" },
  { value: "Contractor", label: "Contractor" },
  { value: "Manager", label: "Manager" },
  { value: "Admin", label: "Admin" },
];

export function NewUserModal({
  open,
  onOpenChange,
  onSuccess,
}: NewUserModalProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("Unassigned");
  const [contractStartDate, setContractStartDate] = React.useState<
    Date | undefined
  >();
  const [contractEndDate, setContractEndDate] = React.useState<
    Date | undefined
  >();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [startDateOpen, setStartDateOpen] = React.useState(false);
  const [endDateOpen, setEndDateOpen] = React.useState(false);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("Unassigned");
      setContractStartDate(undefined);
      setContractEndDate(undefined);
    }
  }, [open]);

  const isContractor = role === "Contractor";

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim()) {
      toast.error("Please enter first name");
      return;
    }

    if (!lastName.trim()) {
      toast.error("Please enter last name");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter email address");
      return;
    }

    // Validate email format and domain
    const emailRegex = /^[^\s@]+@intellibus\.com$/;
    if (!emailRegex.test(email)) {
      toast.error("Email must be a valid @intellibus.com address");
      return;
    }

    if (role === "Unassigned") {
      toast.error("Please select a role");
      return;
    }

    // Validate contract dates for contractors
    if (isContractor) {
      if (!contractStartDate) {
        toast.error("Please select contract start date");
        return;
      }
      if (!contractEndDate) {
        toast.error("Please select contract end date");
        return;
      }
      if (contractEndDate <= contractStartDate) {
        toast.error("Contract end date must be after start date");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role: role.toLowerCase(),
      };

      // Add contract dates for contractors
      if (isContractor && contractStartDate && contractEndDate) {
        payload.contractStartDate = format(contractStartDate, "yyyy-MM-dd");
        payload.contractEndDate = format(contractEndDate, "yyyy-MM-dd");
      }

      const apiBase = import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001";
      const response = await fetch(`${apiBase}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      toast.success("User pre-registered successfully", {
        description: `${firstName} ${lastName} will be assigned the ${role} role when they sign in`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] bg-white p-0"
        aria-describedby="new-user-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Pre-Register User
          </DialogTitle>
          <DialogDescription
            id="new-user-description"
            className="text-sm text-gray-600"
          >
            Pre-register a user who will be assigned this role when they sign in with Google
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 space-y-4">
          {/* First Name */}
          <div>
            <Label
              htmlFor="first-name"
              className="text-sm font-medium text-gray-900 mb-1.5 block"
            >
              First Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              className="h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>

          {/* Last Name */}
          <div>
            <Label
              htmlFor="last-name"
              className="text-sm font-medium text-gray-900 mb-1.5 block"
            >
              Last Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              className="h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>

          {/* Email */}
          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-900 mb-1.5 block"
            >
              Intellibus Email <span className="text-red-600">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@intellibus.com"
              className="h-11 bg-gray-50 border-gray-200 rounded-lg"
            />
          </div>

          {/* Role */}
          <div>
            <Label
              htmlFor="role"
              className="text-sm font-medium text-gray-900 mb-1.5 block"
            >
              Assigned Role <span className="text-red-600">*</span>
            </Label>
            <Combobox
              value={role}
              onValueChange={setRole}
              options={ROLE_OPTIONS}
              placeholder="Select role"
              className="w-full"
            />
          </div>

          {/* Contract Dates - Only show for Contractor role */}
          {isContractor && (
            <>
              {/* Contract Start Date */}
              <div>
                <Label
                  htmlFor="contract-start"
                  className="text-sm font-medium text-gray-900 mb-1.5 block"
                >
                  Contract Start Date <span className="text-red-600">*</span>
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="contract-start"
                      variant="outline"
                      className="w-full h-11 justify-start text-left font-normal bg-gray-50 border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {contractStartDate ? (
                        format(contractStartDate, "PPP")
                      ) : (
                        <span className="text-gray-500">Select start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={contractStartDate}
                      onSelect={(date) => {
                        setContractStartDate(date);
                        setStartDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Contract End Date */}
              <div>
                <Label
                  htmlFor="contract-end"
                  className="text-sm font-medium text-gray-900 mb-1.5 block"
                >
                  Contract End Date <span className="text-red-600">*</span>
                </Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="contract-end"
                      variant="outline"
                      className="w-full h-11 justify-start text-left font-normal bg-gray-50 border-gray-200 rounded-lg hover:bg-gray-100"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {contractEndDate ? (
                        format(contractEndDate, "PPP")
                      ) : (
                        <span className="text-gray-500">Select end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={contractEndDate}
                      onSelect={(date) => {
                        setContractEndDate(date);
                        setEndDateOpen(false);
                      }}
                      initialFocus
                      disabled={(date) =>
                        contractStartDate ? date <= contractStartDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-lg border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-lg bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pre-Registering...
              </>
            ) : (
              "Pre-Register User"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
