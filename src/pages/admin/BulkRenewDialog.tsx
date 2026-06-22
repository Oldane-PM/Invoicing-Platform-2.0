import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Loader2 } from "lucide-react";
import { addMonths, parseISO, format, startOfMonth, endOfMonth } from "date-fns";
import { Input } from "../../components/ui/input";
import { useBulkCreateWorkOrders } from "../../lib/hooks/useSystemWorkOrders";
import { useAuth } from "../../lib/hooks/useAuth";

interface BulkRenewDialogProps {
  open: boolean;
  onClose: () => void;
  selectedWorkOrders: any[];
}

export function BulkRenewDialog({ open, onClose, selectedWorkOrders }: BulkRenewDialogProps) {
  const { user } = useAuth();
  const bulkCreateMutation = useBulkCreateWorkOrders();
  
  const [durationMonths, setDurationMonths] = React.useState("6");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || selectedWorkOrders.length === 0 || !durationMonths) return;

    const months = parseInt(durationMonths, 10);

    const dataList = selectedWorkOrders.map(wo => {
      let newStartDateStr = "";
      let newEndDateStr = "";
      
      if (wo.end_date) {
        const oldEndDate = parseISO(wo.end_date);
        const newStartDate = startOfMonth(addMonths(oldEndDate, 1));
        const newEndDate = endOfMonth(addMonths(newStartDate, months - 1));
        newStartDateStr = format(newStartDate, "yyyy-MM-dd");
        newEndDateStr = format(newEndDate, "yyyy-MM-dd");
      } else {
        const newStartDate = startOfMonth(new Date());
        const newEndDate = endOfMonth(addMonths(newStartDate, months - 1));
        newStartDateStr = format(newStartDate, "yyyy-MM-dd");
        newEndDateStr = format(newEndDate, "yyyy-MM-dd");
      }

      return {
        contractor_user_id: wo.contractor_user_id,
        created_by_id: user.id,
        role: wo.role,
        pay_type: wo.pay_type,
        pay_amount: wo.pay_amount,
        start_date: newStartDateStr,
        end_date: newEndDateStr,
        work_schedule: wo.work_schedule,
        additional_terms: wo.additional_terms,
      };
    });

    bulkCreateMutation.mutate(dataList, {
      onSuccess: () => {
        onClose();
        setDurationMonths("6");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px] p-6 bg-white border-gray-100 shadow-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Bulk Renew Work Orders
          </DialogTitle>
          <DialogDescription className="text-gray-500 mt-2">
            Select the renewal duration for the {selectedWorkOrders.length} selected contractor{selectedWorkOrders.length !== 1 ? 's' : ''}. New work orders will be generated and sent for signature.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block font-medium">Renewal Duration (Months)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                New work orders will automatically start on the first day of the month following the previous contract's end date, and end on the last day of the month.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkCreateMutation.isPending || !durationMonths}
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Bulk Renew
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
