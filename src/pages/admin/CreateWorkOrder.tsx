import * as React from "react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Combobox } from "../../components/shared/Combobox";
import { Loader2, ArrowLeft } from "lucide-react";
import { useCreateWorkOrder } from "../../lib/hooks/useSystemWorkOrders";
import { useAuth } from "../../lib/hooks/useAuth";
import { useUserAccessUsers } from "../../lib/hooks/userAccess/useUserAccessUsers";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";

interface CreateWorkOrderProps {
  onCancel: () => void;
}

export function CreateWorkOrder({ onCancel }: CreateWorkOrderProps) {
  const { user } = useAuth();
  const { data: users, isLoading: usersLoading } = useUserAccessUsers();
  const createMutation = useCreateWorkOrder();

  const contractorOptions = React.useMemo(() => {
    if (!users) return [];
    return users
      .filter((u) => u.role === "contractor")
      .map((u) => ({ label: u.fullName || u.email, value: u.id }));
  }, [users]);

  const [contractorId, setContractorId] = React.useState("");
  const [role, setRole] = React.useState("Consultant");
  const [payType, setPayType] = React.useState("Fixed");
  const [payAmount, setPayAmount] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [workSchedule, setWorkSchedule] = React.useState("40 hours per week (Minimum)");
  
  const defaultTerms = `<ul>
  <li>Invoices must be sent to invoices@intellibus.com at the end of each month along with Intellibus Reporting Manager approval.</li>
  <li>Payment details must be clearly included in the invoice.</li>
  <li>Any payment detail changes must be highlighted in the invoice and submission email.</li>
  <li>Invoices are processed per CSA payment terms.</li>
  <li>No separate acknowledgment will be sent unless discrepancies exist.</li>
  <li>Payment confirmation will be shared after remittance.</li>
  <li>Regular in-person attendance of at least eight (8) hours per workday is required to provide team members with greater access to collaboration, mentorship, real-time guidance, knowledge sharing, and the resources needed to successfully deliver project outcomes. Any exception to this requirement must be approved in writing by the Pod Leader.</li>
  <li>Daily Git commits are required to maintain a clear record of work, demonstrate progress toward objectives, and ensure continuity.</li>
  <li>A weekly demonstration of deliverables must be submitted through the designated process to support transparency, provide visibility into work performed, enable timely feedback, and maintain consistent communication of outcomes. Each submission must include:
    <ul>
      <li>Demonstration of activities completed during the reporting period;</li>
      <li>Recorded voiceover summarizing key milestones, status updates, and deliverables;</li>
      <li>Written transcript of the recording.</li>
    </ul>
  </li>
  <li>Adherence to these requirements will be considered as part of ongoing performance evaluations and decisions regarding continued engagement.</li>
</ul>`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!contractorId) {
      toast.error("Please select a contractor");
      return;
    }

    createMutation.mutate(
      {
        contractor_user_id: contractorId,
        created_by_id: user.id,
        role,
        pay_type: payType,
        pay_amount: parseFloat(payAmount),
        start_date: startDate,
        end_date: endDate,
        work_schedule: workSchedule,
        additional_terms: defaultTerms,
      },
      {
        onSuccess: () => {
          onCancel();
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center h-10 gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Generate Work Order</h2>
          <p className="text-sm text-gray-600">Create a new work order and send to the contractor for signature.</p>
        </div>
      </div>

      <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden w-full">
        <div className="p-8">
          <form id="create-work-order-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div>
              <Label className="mb-2 block font-medium">Contractor</Label>
              <Combobox
                value={contractorId}
                onValueChange={setContractorId}
                options={contractorOptions}
                placeholder={usersLoading ? "Loading contractors..." : "Select Contractor"}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block font-medium">Role</Label>
                <Input 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Consultant"
                  required
                />
              </div>
              <div>
                <Label className="mb-2 block font-medium">Pay Type</Label>
                <Combobox
                  value={payType}
                  onValueChange={setPayType}
                  options={[
                    { label: "Fixed", value: "Fixed" },
                    { label: "Hourly", value: "Hourly" }
                  ]}
                  placeholder="Select Type"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block font-medium">Pay Amount ($)</Label>
              <Input 
                type="number"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="5000.00"
                required
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block font-medium">Start Date</Label>
                <Input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label className="mb-2 block font-medium">End Date</Label>
                <Input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block font-medium">Work Schedule</Label>
              <Input 
                value={workSchedule}
                onChange={(e) => setWorkSchedule(e.target.value)}
                placeholder="e.g. 40 hours per week (Minimum)"
                required
              />
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Generate & Send
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
