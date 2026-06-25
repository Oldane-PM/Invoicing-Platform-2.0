import * as React from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Loader2, FileSignature } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useContractorWorkOrders } from "../../lib/hooks/useSystemWorkOrders";
import { useAuth } from "../../lib/hooks/useAuth";
import { SignWorkOrder } from "./SignWorkOrder";
import { ArrowLeft } from "lucide-react";

interface ContractorWorkOrdersProps {
  onBack?: () => void;
}

export function ContractorWorkOrders({ onBack }: ContractorWorkOrdersProps) {
  const { user } = useAuth();
  const { data: workOrders, isLoading } = useContractorWorkOrders(user?.id);
  
  const [selectedWorkOrderId, setSelectedWorkOrderId] = React.useState<string | null>(null);
  const [isSigning, setIsSigning] = React.useState(false);

  const handleRowClick = (id: string) => {
    setSelectedWorkOrderId(id);
    setIsSigning(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING_CONTRACTOR_SIGNATURE":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "PENDING_FINANCE_SIGNATURE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_CONTRACTOR_SIGNATURE": return "Needs Your Signature";
      case "PENDING_FINANCE_SIGNATURE": return "Awaiting Countersignature";
      case "COMPLETED": return "Completed";
      default: return status;
    }
  };

  if (isSigning && selectedWorkOrderId) {
    return (
      <SignWorkOrder 
        workOrderId={selectedWorkOrderId} 
        onClose={() => {
          setIsSigning(false);
          setSelectedWorkOrderId(null);
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <div className="mb-2">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="text-[#003B5C] bg-[#F4F5F7] hover:bg-[#E5E7EB] hover:text-[#002D4A] rounded-[100px] px-4 py-2 h-9 text-[15px] font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 min-h-[40px]">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Work Orders</h2>
          <p className="text-sm text-gray-600">Review and sign your work orders.</p>
        </div>
      </div>
      
      <Card className="border border-gray-200 rounded-[14px] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium px-6">
                  Period
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Role
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Pay Rate
                </TableHead>
                <TableHead className="h-12 text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 mb-3 animate-spin" />
                      <div className="text-gray-600 font-medium">Loading work orders...</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !workOrders || workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileSignature className="w-16 h-16 mb-3 text-gray-300" strokeWidth={1.5} />
                      <div className="text-gray-600 font-medium">No work orders found</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo: any) => (
                  <TableRow
                    key={wo.id}
                    className="h-16 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                    onClick={() => handleRowClick(wo.id)}
                  >
                    <TableCell className="px-6 text-sm text-gray-600">
                      {format(new Date(wo.start_date.toString().substring(0, 10) + "T12:00:00Z"), "MMM d, yyyy")} - {format(new Date(wo.end_date.toString().substring(0, 10) + "T12:00:00Z"), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">{wo.role}</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      ${wo.pay_amount.toLocaleString()} / {wo.pay_type === 'Hourly' ? 'hr' : 'mo'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(wo.status)} border rounded-full px-3 py-1 font-medium text-xs`}>
                        {getStatusLabel(wo.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
