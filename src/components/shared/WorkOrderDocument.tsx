import { format } from "date-fns";
import type { SystemWorkOrder } from "../../lib/supabase/repos/systemWorkOrders.repo";

interface WorkOrderDocumentProps {
  workOrder: SystemWorkOrder;
}

export function WorkOrderDocument({ workOrder }: WorkOrderDocumentProps) {
  // Safe formatting helpers
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatSignatureDate = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "MM/dd/yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTimestamp = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return format(d, "MMM d, yyyy HH:mm:ss") + " GMT"; 
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white p-12 max-w-[850px] mx-auto print:p-0 print:max-w-none text-black shadow-sm rounded-lg print:shadow-none" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-center gap-3">
          {/* Intellibus Logo approximation */}
          <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 35L50 20L85 35V65L50 80L15 65V35Z" stroke="#0C5395" strokeWidth="8" strokeLinejoin="round"/>
            <path d="M15 35L50 50L85 35" stroke="#0C5395" strokeWidth="8" strokeLinejoin="round"/>
            <path d="M50 50V80" stroke="#0C5395" strokeWidth="8" strokeLinejoin="round"/>
            <rect x="35" y="32" width="14" height="10" transform="skewX(-30) rotate(-15)" fill="#0C5395" />
          </svg>
          <span className="text-[32px] font-bold tracking-tight" style={{ color: "#0C5395" }}>Intellibus</span>
        </div>
        <div className="text-right text-[14px] leading-relaxed text-black mt-2">
          <p>12020 Sunrise Valley Drive, Suite 101</p>
          <p>Reston, VA, 20191</p>
          <p>202-640-8868 | <a href="https://intellibus.com" className="text-blue-600 hover:underline">intellibus.com</a></p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="font-bold text-[15px] uppercase tracking-wide">EXHIBIT A</h1>
        <h2 className="font-bold text-[15px] uppercase tracking-wide mt-1">WORK ORDER # 1</h2>
      </div>

      {/* Intro Text */}
      <div className="mb-8 text-[15px] leading-[1.6] text-black">
        <p>
          This Work Order is executed pursuant to the Consulting Services Agreement dated{" "}
          {formatDate(workOrder.created_at || new Date().toISOString())}, and entered into by and between{" "}
          <span className="font-bold">{workOrder.contractor_name || "Contractor"}</span> and{" "}
          <span className="font-bold">Intellibus</span> and is subject to the terms and conditions of that Agreement.
        </p>
      </div>

      {/* Core Terms */}
      <div className="space-y-[18px] mb-8 text-[15px] text-black">
        <p>
          <span className="font-bold mr-1">Resource Name:</span> {workOrder.contractor_name || "Contractor"}
        </p>
        <p>
          <span className="font-bold mr-1">Role:</span> {workOrder.role}
        </p>
        <p>
          <span className="font-bold mr-1">{workOrder.pay_type === 'Hourly' ? 'Hourly Rate:' : 'Fixed Pay:'}</span>{" "}
          ${Number(workOrder.pay_amount).toLocaleString()} (USD) / {workOrder.pay_type === 'Hourly' ? 'Hour' : 'Month'}
        </p>
        <p>
          <span className="font-bold mr-1">Start Date:</span> {formatDate(workOrder.start_date)}
        </p>
        <p>
          <span className="font-bold mr-1">End Date:</span> {formatDate(workOrder.end_date)}
        </p>
        <p>
          <span className="font-bold mr-1">Work Schedule:</span> {workOrder.work_schedule}
        </p>
      </div>

      {/* Additional Terms */}
      <div className="mb-[60px]">
        <p className="font-bold text-[15px] mb-4">Additional terms and conditions:</p>
        <div 
          className="text-black text-[15px] leading-[1.6] [&_ul]:list-disc [&_ul]:pl-6 [&_ul_ul]:list-[circle] [&_ul_ul]:mt-2 [&_ul_ul]:mb-2 [&_li]:mb-1.5 ml-1"
          dangerouslySetInnerHTML={{ __html: workOrder.additional_terms || "<ul><li>Standard terms apply.</li></ul>" }}
        />
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-start pt-4 gap-16 print:break-inside-avoid">
        
        {/* Contractor Signature Block */}
        <div className="flex-1 max-w-[320px]">
          <div className="font-bold text-[15px] mb-1">{workOrder.contractor_name || "Contractor"}</div>
          <div className="text-[14px] leading-snug mb-[40px] min-h-[42px]">
            1201 chepstow road Waterford<br />
            St. Catherine
          </div>

          <div className="flex mb-[18px]">
            <div className="text-[15px] mr-[6px] mt-auto pb-1">By:</div>
            <div className="flex-1 flex flex-col">
              <div className="h-[60px] relative border-b-[1.5px] border-black w-full">
                {workOrder.contractor_signature_data && (
                  <img 
                    src={workOrder.contractor_signature_data} 
                    className="absolute bottom-[6px] left-0 max-h-[54px] w-auto object-contain mix-blend-multiply" 
                    alt="Signature"
                  />
                )}
              </div>
              {workOrder.contractor_signed_at && (
                <div className="text-[9px] text-[#0056b3] mt-[2px] leading-tight self-start pb-[2px]">
                  {workOrder.contractor_signature_name} ({formatTimestamp(workOrder.contractor_signed_at)})
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-end mb-[18px]">
            <div className="text-[15px] mr-[6px] pb-[3px] w-[45px]">Name:</div>
            <div className="flex-1 border-b-[1.5px] border-black pb-[6px] text-[20px] leading-tight px-1 font-serif italic">
              {workOrder.contractor_signature_name || ""}
            </div>
          </div>

          <div className="flex items-end mb-[18px]">
            <div className="text-[15px] mr-[6px] pb-[3px] w-[45px]">Title:</div>
            <div className="flex-1 border-b-[1.5px] border-black pb-[6px] text-[18px] leading-tight px-1">
              {workOrder.role}
            </div>
          </div>

          <div className="flex items-end">
            <div className="text-[15px] mr-[6px] pb-[3px] w-[45px]">Date:</div>
            <div className="flex-1 border-b-[1.5px] border-black pb-[6px] text-[18px] leading-tight px-1 tracking-wide">
              {formatSignatureDate(workOrder.contractor_signed_at)}
            </div>
          </div>
        </div>

        {/* Intellibus Signature Block */}
        <div className="flex-1 max-w-[320px]">
          <div className="font-bold text-[15px] mb-1">Intellibus</div>
          <div className="text-[14px] leading-snug mb-[40px] min-h-[42px]">
            12020 Sunrise Valley Dr<br />
            Reston VA 20191
          </div>

          <div className="flex mb-[18px]">
            <div className="text-[15px] mr-[6px] mt-auto pb-1">By:</div>
            <div className="flex-1 flex flex-col">
              <div className="h-[60px] relative border-b-[1.5px] border-black w-full">
                {workOrder.finance_signature_data && (
                  <img 
                    src={workOrder.finance_signature_data} 
                    className="absolute bottom-[6px] left-0 max-h-[54px] w-auto object-contain mix-blend-multiply" 
                    alt="Signature"
                  />
                )}
              </div>
              {workOrder.finance_signed_at && (
                <div className="text-[9px] text-[#0056b3] mt-[2px] leading-tight self-start pb-[2px]">
                  {workOrder.finance_signature_name} ({formatTimestamp(workOrder.finance_signed_at)})
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-end mb-[18px]">
            <div className="text-[15px] mr-[6px] pb-[3px] w-[45px]">Name:</div>
            <div className="flex-1 border-b-[1.5px] border-black pb-[6px] text-[20px] leading-tight px-1 font-serif italic">
              {workOrder.finance_signature_name || ""}
            </div>
          </div>

          <div className="flex items-end mb-[18px]">
            <div className="text-[15px] mr-[6px] pb-[3px] w-[45px]">Title:</div>
            <div className="flex-1 border-b-[1.5px] border-black pb-[6px] text-[18px] leading-tight px-1">
              Head of HR & Finance
            </div>
          </div>

          <div className="flex items-end">
            <div className="text-[15px] mr-[6px] pb-[3px] w-[45px]">Date:</div>
            <div className="flex-1 border-b-[1.5px] border-black pb-[6px] text-[18px] leading-tight px-1 tracking-wide">
              {formatSignatureDate(workOrder.finance_signed_at)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
