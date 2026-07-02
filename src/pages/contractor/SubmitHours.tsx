import * as React from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

import { toast } from "sonner";
import {
  CalendarIcon,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  format,
  parse,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateSubmission, SUBMISSIONS_QUERY_KEY } from "../../lib/hooks/contractor/useCreateSubmission";
import { INVOICE_QUERY_KEY } from "../../lib/hooks/invoices";
import { replaceInvoiceAfterSubmissionEditApi } from "../../lib/api/invoiceClient";
import { useSubmittedPeriods } from "../../lib/hooks/contractor/useSubmittedPeriods";
import { useContractorProfile } from "../../lib/hooks/contractor/useContractorProfile";
import { useVendorOnboarding } from "../../lib/hooks/contractor/useVendorOnboarding";
import { useNonWorkingDays } from "../../lib/hooks/adminCalendar";
import type { SubmissionDraft, ContractorSubmission } from "../../lib/types";

interface SubmitHoursPageProps {
  onCancel: () => void;
  onSuccess?: () => void;
  editingSubmission?: ContractorSubmission | null;
}

type DayState = "working" | "excluded" | "weekend" | "holiday";

interface DayInfo {
  date: Date;
  state: DayState;
  holidayName?: string; // Name of the holiday/time-off if applicable
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function SubmitHoursPage({ onCancel, onSuccess, editingSubmission }: SubmitHoursPageProps) {
  const isEditMode = !!editingSubmission;
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<number>(
    currentDate.getFullYear()
  );
  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false);
  const [excludedDates, setExcludedDates] = React.useState<Date[]>([]);
  const [hoursSubmitted, setHoursSubmitted] = React.useState("");
  const [isHoursManuallyEdited, setIsHoursManuallyEdited] =
    React.useState(false);
  const [description, setDescription] = React.useState("");
  const [overtimeHours, setOvertimeHours] = React.useState("");
  const [overtimeDescription, setOvertimeDescription] = React.useState("");
  const [paymentLink, setPaymentLink] = React.useState("");
  const isPrePopulatingRef = React.useRef(false);

  const queryClient = useQueryClient();

  // Use the create submission hook
  const { create, loading: isSubmitting } = useCreateSubmission();

  // Get already-submitted periods to prevent duplicates
  const { isMonthSubmitted, loading: loadingPeriods } = useSubmittedPeriods();

  // Contractor profile hook available for role-based filtering of time-off.
  useContractorProfile();

  // Onboarding-entered rate is the source of truth for whether the contractor is
  // fixed/salary (mirrors the Profile page). Fixed contractors are paid a constant
  // monthly amount, so hours/day-selection are irrelevant to their invoice.
  const { data: onboarding } = useVendorOnboarding();
  const isFixedRate = onboarding?.onboarding_rate_type === "fixed";
  const fixedMonthlyRate =
    onboarding?.onboarding_rate != null ? Number(onboarding.onboarding_rate) : null;

  const isMonthWithinContractRange = React.useCallback((monthIndex: number, year: number) => {
    if (!onboarding) return true; // Default to open if onboarding is still loading
    const start = onboarding.contract_start_date;
    const end = onboarding.contract_end_date;
    if (!start) return true;

    const periodStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const startPeriod = start.substring(0, 7);
    const endPeriod = end ? end.substring(0, 7) : null;

    if (periodStr < startPeriod) return false;
    if (endPeriod && periodStr > endPeriod) return false;
    return true;
  }, [onboarding]);

  const isTargetMonthAllowed = React.useCallback((monthIndex: number, year: number) => {
    const isWithinContract = isMonthWithinContractRange(monthIndex, year);
    const alreadySubmitted = isMonthSubmitted(monthIndex, year);
    const isEditingThisMonth = isEditMode && editingSubmission?.workPeriod === `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    return isWithinContract || alreadySubmitted || isEditingThisMonth;
  }, [isMonthWithinContractRange, isMonthSubmitted, isEditMode, editingSubmission]);

  const { canGoPrev, canGoNext } = React.useMemo(() => {
    if (selectedMonth === null) return { canGoPrev: false, canGoNext: false };
    const pm = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const py = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const nm = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const ny = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    
    return {
      canGoPrev: isTargetMonthAllowed(pm, py),
      canGoNext: isTargetMonthAllowed(nm, ny),
    };
  }, [selectedMonth, selectedYear, isTargetMonthAllowed]);

  // Calculate range for non-working days based on selected month
  const monthRange = React.useMemo(() => {
    if (selectedMonth === null) {
      // Default to current month if none selected
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    return {
      start: startOfMonth(monthStart),
      end: endOfMonth(monthStart),
    };
  }, [selectedMonth, selectedYear]);

  // Get non-working days (holidays/time-off) for contractors
  // Pass contractor role for role-based filtering
  const { nonWorkingDays } = useNonWorkingDays(
    monthRange.start,
    monthRange.end,
    "CONTRACTOR" // Contractors have role="CONTRACTOR" - time-off entries targeting this role will apply
  );

  // Check if overtime description is required
  const isOvertimeDescriptionRequired = React.useMemo(() => {
    const hours = parseFloat(overtimeHours);
    return !isNaN(hours) && hours > 0;
  }, [overtimeHours]);

  // Clear projects when leaving edit mode (e.g. parent clears editingSubmission)
  React.useEffect(() => {
    if (!editingSubmission) {
      // no-op: projects removed
    }
  }, [editingSubmission]);

  // Pre-populate form when editing a submission
  React.useEffect(() => {
    if (editingSubmission && editingSubmission.workPeriod) {
      // Parse work period (format: "YYYY-MM" e.g., "2026-11")
      try {
        isPrePopulatingRef.current = true;
        const workPeriodDate = parse(editingSubmission.workPeriod, "yyyy-MM", new Date());
        
        // Validate the parsed date
        if (isNaN(workPeriodDate.getTime())) {
          throw new Error("Invalid date parsed from work period");
        }
        
        const month = workPeriodDate.getMonth();
        const year = workPeriodDate.getFullYear();
        
        setSelectedMonth(month);
        setSelectedYear(year);
        setHoursSubmitted(editingSubmission.regularHours.toString());
        setDescription(editingSubmission.description || "");
        setOvertimeHours(editingSubmission.overtimeHours?.toString() || "");
        setOvertimeDescription(editingSubmission.overtimeDescription || "");
        setPaymentLink(editingSubmission.paymentLink || "");
        setIsHoursManuallyEdited(true); // Prevent auto-calculation from overwriting

        // Projects removed - no longer populated

        // Load excluded dates if they exist
        console.log('[SubmitHours] editingSubmission.excludedDates:', editingSubmission.excludedDates);
        if (editingSubmission.excludedDates && editingSubmission.excludedDates.length > 0) {
          const parsedExcludedDates = editingSubmission.excludedDates
            .map(dateStr => parse(dateStr, "yyyy-MM-dd", new Date()))
            .filter(date => !isNaN(date.getTime()));
          console.log('[SubmitHours] Parsed excluded dates:', parsedExcludedDates);
          setExcludedDates(parsedExcludedDates);
        } else {
          console.log('[SubmitHours] No excluded dates to load');
        }
        
        // Allow clear effect to run after pre-population is complete
        setTimeout(() => {
          isPrePopulatingRef.current = false;
        }, 100);
      } catch (error) {
        console.error("Error parsing work period:", error);
        toast.error("Failed to load submission data");
        isPrePopulatingRef.current = false;
      }
    }
  }, [editingSubmission]);

  // If submission details arrive with projects after first paint (cache refresh / async), keep the picker in sync
  React.useEffect(() => {
    // Projects removed - no-op
  }, [isEditMode, editingSubmission?.id, editingSubmission?.projectId, editingSubmission?.projectIds]);

  // Clear overtime description when overtime hours is cleared or set to 0
  // Don't clear during initial pre-population
  React.useEffect(() => {
    if (!isOvertimeDescriptionRequired && !isPrePopulatingRef.current) {
      setOvertimeDescription("");
    }
  }, [isOvertimeDescriptionRequired]);

  // Generate calendar days for selected month
  const calendarDays = React.useMemo((): DayInfo[] => {
    if (selectedMonth === null) return [];

    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth, 1));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map((date) => {
      // Check if it's a weekend first
      if (isWeekend(date)) {
        return { date, state: "weekend" as DayState };
      }

      // Check if it's a non-working day (holiday/time-off)
      const dateKey = format(date, "yyyy-MM-dd");
      if (nonWorkingDays.has(dateKey)) {
        return { date, state: "holiday" as DayState, holidayName: "Non-working day" };
      }

      // Check if manually excluded
      const isExcluded = excludedDates.some((excludedDate) =>
        isSameDay(excludedDate, date)
      );
      return { date, state: isExcluded ? "excluded" : "working" } as DayInfo;
    });
  }, [selectedMonth, selectedYear, excludedDates, nonWorkingDays]);

  // Calculate working days
  const workingDaysCount = React.useMemo(() => {
    return calendarDays.filter((day) => day.state === "working").length;
  }, [calendarDays]);

  const autoCalculatedHours = workingDaysCount * 8;

  // Update hours when working days change (only if not manually edited)
  React.useEffect(() => {
    // Fixed-rate contractors aren't paid by the hour, so never derive hours from
    // selected working days for them.
    if (!isFixedRate && workingDaysCount > 0 && !isHoursManuallyEdited) {
      setHoursSubmitted(autoCalculatedHours.toString());
    }
  }, [isFixedRate, workingDaysCount, autoCalculatedHours, isHoursManuallyEdited]);

  // Set default hours for fixed-rate contractors to 160, and clear overtime states
  React.useEffect(() => {
    if (isFixedRate && !isEditMode) {
      setHoursSubmitted("160");
      setOvertimeHours("");
      setOvertimeDescription("");
    }
  }, [isFixedRate, isEditMode]);

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setExcludedDates([]); // Reset exclusions when month changes
    setIsHoursManuallyEdited(false); // Reset manual edit flag when period changes
    setMonthPickerOpen(false);
  };

  const handleYearChange = (direction: "prev" | "next") => {
    setSelectedYear((prev) => (direction === "prev" ? prev - 1 : prev + 1));
  };

  const handleDayClick = (dayInfo: DayInfo) => {
    // Weekends and holidays are not clickable
    if (dayInfo.state === "weekend") return;
    
    if (dayInfo.state === "holiday") {
      toast.error("This is a non-working day (holiday/time-off)", {
        description: "This day cannot be selected for work hours.",
      });
      return;
    }

    const { date } = dayInfo;

    if (dayInfo.state === "working") {
      // Exclude this day
      setExcludedDates([...excludedDates, date]);
      setIsHoursManuallyEdited(false); // Allow auto-calculation to update hours
      toast.info("Day excluded from calculation");
    } else if (dayInfo.state === "excluded") {
      // Re-include this day
      setExcludedDates(excludedDates.filter((d) => !isSameDay(d, date)));
      setIsHoursManuallyEdited(false); // Allow auto-calculation to update hours
      toast.success("Day added back to calculation");
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoursSubmitted(e.target.value);
    setIsHoursManuallyEdited(true);
  };

  const handleSubmit = async () => {
    if (selectedMonth === null) {
      toast.error("Please select a work period");
      return;
    }

    // Fixed/salary contractors are paid a constant monthly amount, so hours are
    // optional and informational only.
    if (!isFixedRate && (!hoursSubmitted || parseInt(hoursSubmitted) === 0)) {
      toast.error("Please enter hours submitted");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    if (isOvertimeDescriptionRequired && !overtimeDescription.trim()) {
      toast.error("Please provide a description for overtime hours");
      return;
    }



    // Build the submission draft
    const workPeriod = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    const excludedDatesStrings = excludedDates.map((d) =>
      format(d, "yyyy-MM-dd")
    );

    const draft: SubmissionDraft = {
      workPeriod,
      excludedDates: isFixedRate ? [] : excludedDatesStrings,
      hoursSubmitted: isFixedRate ? 160 : (parseInt(hoursSubmitted) || 0),
      description: description.trim(),
      overtimeHours: isFixedRate ? 0 : (parseInt(overtimeHours) || 0),
      overtimeDescription: isFixedRate ? null : (overtimeDescription.trim() || null),
      paymentLink: paymentLink.trim() || null,
      projectName: "General Work",
      projectId: undefined,
      projectIds: [],
      projectNames: [],
    };


    // Create submission via hook
    try {
      let result;
      
      // If editing, update the existing submission
      if (isEditMode && editingSubmission) {
        const { getSubmissionsDataSource } = await import('../../lib/data/submissionsDataSource');
        const dataSource = getSubmissionsDataSource();
        result = await dataSource.resubmitAfterRejection(editingSubmission.id, draft);
        try {
          await replaceInvoiceAfterSubmissionEditApi(editingSubmission.id);
        } catch (replaceErr) {
          console.error("[SubmitHours] Invoice replace after edit failed:", replaceErr);
          toast.error("Hours saved, but the invoice could not be refreshed", {
            description:
              replaceErr instanceof Error ? replaceErr.message : "Try opening your invoice again later.",
          });
        }
        queryClient.invalidateQueries({ queryKey: [INVOICE_QUERY_KEY, editingSubmission.id] });
        queryClient.invalidateQueries({ queryKey: [SUBMISSIONS_QUERY_KEY] });
      } else {
        // Otherwise, create a new submission
        result = await create(draft);
      }

      if (result) {
        // Format work period for toast message (e.g., "Jan 2026")
        const workPeriodDisplay = format(
          new Date(selectedYear, selectedMonth, 1),
          "MMM yyyy"
        );
        
        toast.success(`Hours ${isEditMode ? 'updated' : 'submitted'} for ${workPeriodDisplay}`, {
          description: isEditMode 
            ? "Your submission has been updated" 
            : "Your submission has been sent for review",
        });

        // Navigate to dashboard on success
        if (onSuccess) {
          onSuccess();
        } else {
          onCancel();
        }
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'submit'} hours`, {
          description: "Please try again later",
        });
      }
    } catch (err) {
      // Handle specific errors (e.g., duplicate work period)
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error(`${isEditMode ? 'Update' : 'Submission'} failed`, {
        description: errorMessage,
      });
    }
  };

  const handleCancel = () => {
    setSelectedMonth(null);
    setSelectedYear(currentDate.getFullYear());
    setExcludedDates([]);
    setHoursSubmitted("");
    setIsHoursManuallyEdited(false);
    setDescription("");
    setOvertimeHours("");
    setOvertimeDescription("");
    setPaymentLink("");
    onCancel();
  };

  const displayValue =
    selectedMonth !== null ? `${MONTHS[selectedMonth]} ${selectedYear}` : "";

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4 md:mb-6 -ml-2 h-9 md:h-10 px-2 text-sm md:text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
          Back to Dashboard
        </Button>

        {/* Page Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
            {isEditMode ? "Edit Submission" : "Submit Hours"}
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            {isEditMode 
              ? "Update your work hours for the selected time period"
              : "Submit your work hours for a selected time period"
            }
          </p>
        </div>

        {/* Message for New Users */}
        {!isEditMode && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 ml-2">
              Before submitting your hours, please upload your W-8BEN and work orders in the Contractor Profile.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Content */}
        <div className="bg-white rounded-[14px] border border-gray-200 p-4 md:p-6">


          <div className="space-y-5">
            {/* Work Period - Month & Year Picker */}
            <div>
              <Label
                htmlFor="work-period"
                className="text-sm font-medium text-gray-900 mb-1.5 block"
              >
                Work Period <span className="text-red-600">*</span>
              </Label>
              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="work-period"
                    variant="outline"
                    className="w-full h-11 justify-start text-left font-normal bg-white border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {displayValue || (
                      <span className="text-gray-500">
                        Select month and year
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  {/* Month & Year Picker */}
                  <div className="p-4">
                    {/* Year Selector */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleYearChange("prev")}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedYear}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleYearChange("next")}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Month Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {MONTHS.map((month, index) => {
                        const alreadySubmitted = isMonthSubmitted(index, selectedYear);
                        const isWithinContract = isMonthWithinContractRange(index, selectedYear);
                        const isEditingThisMonth = isEditMode && editingSubmission?.workPeriod === `${selectedYear}-${String(index + 1).padStart(2, "0")}`;
                        const isDisabled = !isEditingThisMonth && (alreadySubmitted || !isWithinContract);

                        return (
                          <Button
                            key={month}
                            variant={
                              selectedMonth === index ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handleMonthSelect(index)}
                            disabled={isDisabled}
                            className={`h-9 relative ${
                              alreadySubmitted
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 hover:bg-gray-100"
                                : !isWithinContract && !isEditingThisMonth
                                  ? "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200 hover:bg-gray-50"
                                  : selectedMonth === index
                                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                                    : "hover:bg-gray-100"
                            }`}
                            title={
                              alreadySubmitted
                                ? "Already submitted"
                                : !isWithinContract && !isEditingThisMonth
                                  ? "Outside contract period"
                                  : undefined
                            }
                          >
                            {month.slice(0, 3)}
                            {alreadySubmitted && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    {/* Legend for submitted periods */}
                    {!loadingPeriods && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span>Already submitted</span>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Interactive Calendar Section — hidden for fixed-rate contractors,
                who select only the work-period month (hours don't affect pay). */}
            {!isFixedRate && selectedMonth !== null && calendarDays.length > 0 && (
              <div className="space-y-4 pt-2">
                {/* Info Banner */}
                <div className="bg-[#EEF3FF] border border-blue-200 rounded-[10px] p-4 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 leading-relaxed">
                      <span className="font-semibold">
                        {workingDaysCount} working days selected
                      </span>
                      <br />
                      Click on days to exclude them from calculation. Weekends
                      are automatically excluded.
                    </p>
                  </div>
                </div>

                {/* Calendar Grid - Smaller Design */}
                <div className="bg-white rounded-[14px] p-4 border border-gray-200 max-w-[400px] mx-auto">
                  {/* Month Header with Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear(selectedYear - 1);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                        setExcludedDates([]);
                        setIsHoursManuallyEdited(false);
                      }}
                      disabled={!canGoPrev}
                      className="h-8 w-8 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-base font-semibold text-gray-900">
                      {MONTHS[selectedMonth]} {selectedYear}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear(selectedYear + 1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                        setExcludedDates([]);
                        setIsHoursManuallyEdited(false);
                      }}
                      disabled={!canGoNext}
                      className="h-8 w-8 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-medium text-gray-500 py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Padding for first week - adjust for Monday start */}
                    {calendarDays.length > 0 &&
                      Array.from({
                        length:
                          calendarDays[0].date.getDay() === 0
                            ? 6
                            : calendarDays[0].date.getDay() - 1,
                      }).map((_, i) => (
                        <div key={`pad-${i}`} className="aspect-square" />
                      ))}

                    {/* Actual Days */}
                    {calendarDays.map((dayInfo, index) => {
                      const isClickable = dayInfo.state !== "weekend" && dayInfo.state !== "holiday";

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDayClick(dayInfo)}
                          disabled={!isClickable}
                          title={
                            dayInfo.state === "weekend"
                              ? "Weekend - not counted"
                              : dayInfo.state === "holiday"
                                ? "Non-working day (holiday/time-off)"
                                : dayInfo.state === "excluded"
                                  ? "Click to include this day"
                                  : "Click to exclude this day"
                          }
                          className={`
                            aspect-square flex items-center justify-center rounded-full text-xs font-semibold transition-all
                            ${
                              dayInfo.state === "working"
                                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                                : dayInfo.state === "excluded"
                                  ? "bg-white border-2 border-red-400 text-red-500 hover:bg-red-50 cursor-pointer"
                                  : dayInfo.state === "holiday"
                                    ? "bg-orange-100 text-orange-400 cursor-not-allowed border-2 border-orange-300"
                                    : "bg-blue-50 text-blue-200 cursor-not-allowed"
                            }
                          `}
                        >
                          {format(dayInfo.date, "d")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-[10px] md:text-xs">
                      5
                    </div>
                    <span>Working</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white border-2 border-red-400 flex items-center justify-center text-red-500 font-semibold text-[10px] md:text-xs">
                      5
                    </div>
                    <span>Excluded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-orange-400 font-semibold text-[10px] md:text-xs">
                      5
                    </div>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-200 font-semibold text-[10px] md:text-xs">
                      5
                    </div>
                    <span>Weekend</span>
                  </div>
                </div>
              </div>
            )}

            {/* Fixed-rate banner: invoice is a constant monthly amount, no hours */}
            {isFixedRate && (
              <div className="bg-[#EEF3FF] border border-blue-200 rounded-[10px] p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-blue-900 leading-relaxed">
                  <span className="font-semibold">Fixed monthly rate</span>
                  {fixedMonthlyRate != null
                    ? ` of $${fixedMonthlyRate.toLocaleString()}`
                    : ""}
                  . Just choose the work-period month — your invoice is billed at
                  this constant amount, so there are no hours or days to enter.
                </div>
              </div>
            )}

            {/* Hours Submitted — hidden for fixed-rate contractors (hours don't
                affect their pay; they only pick the month). */}
            {!isFixedRate && (
              <div>
                <Label
                  htmlFor="hours-submitted"
                  className="text-sm font-medium text-gray-900 mb-1.5 block"
                >
                  Hours Submitted
                </Label>
                <Input
                  id="hours-submitted"
                  type="number"
                  value={hoursSubmitted}
                  onChange={handleHoursChange}
                  className="h-11 bg-white border-gray-300 rounded-lg"
                  placeholder="0"
                />
                {workingDaysCount > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Auto-calculated: {workingDaysCount} days x 8 hours ={" "}
                    {autoCalculatedHours} hours (editable)
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <Label
                htmlFor="description"
                className="text-sm font-medium text-gray-900 mb-1.5 block"
              >
                Description <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work completed during this period..."
                rows={4}
                className="bg-white border-gray-300 rounded-lg resize-none"
              />
            </div>

            {/* Overtime Hours — hidden for fixed-rate contractors (no hourly pay) */}
            {!isFixedRate && (
              <div>
                <Label
                  htmlFor="overtime"
                  className="text-sm font-medium text-gray-900 mb-1.5 block"
                >
                  Overtime Hours{" "}
                  <span className="text-gray-500 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="overtime"
                  type="number"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  className="h-11 bg-white border-gray-300 rounded-lg"
                  placeholder="0"
                />
              </div>
            )}

            {/* Overtime Description - Conditional with Animation */}
            <AnimatePresence>
              {isOvertimeDescriptionRequired && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="pt-1">
                    <Label
                      htmlFor="overtime-description"
                      className="text-sm font-medium text-gray-900 mb-1.5 block"
                    >
                      Overtime Description{" "}
                      <span className="text-red-600">*</span>
                    </Label>
                    <Textarea
                      id="overtime-description"
                      value={overtimeDescription}
                      onChange={(e) => setOvertimeDescription(e.target.value)}
                      placeholder="Describe the work performed during overtime hours"
                      rows={4}
                      className="bg-white border-gray-300 rounded-lg resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment Link */}
            <div>
              <Label
                htmlFor="payment-link"
                className="text-sm font-medium text-gray-900 mb-1.5 block"
              >
                Payment Link / Email Address{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="payment-link"
                type="text"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                className="h-11 bg-white border-gray-300 rounded-lg"
                placeholder="e.g., https://paypal.me/yourname or your@email.com"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Include a link or email address to accept payments directly.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-lg border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-lg bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Submitting..."}
                </>
              ) : (
                isEditMode ? "Update Submission" : "Submit Hours"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
