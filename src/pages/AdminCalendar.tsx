import * as React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { toast } from "sonner";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarPlus, X, Info, Trash2, CalendarCheck, Calendar as CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";

import { 
  useCalendarEntries, 
  useCreateCalendarEntry, 
  useUpdateCalendarEntry, 
  useDeleteCalendarEntry 
} from "../lib/hooks/adminCalendar";
import { TimeOffEntry, CalendarEntryType, CalendarAppliesTo } from "../lib/data/adminCalendar";

const mockCountries = [
  { value: "all", label: "All Countries" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "jm", label: "Jamaica" },
];

const mockTeams = [
  { value: "all", label: "All Teams" },
  { value: "engineering", label: "Engineering" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
];

type ViewMode = "month" | "year";
type DateRangeMode = "single" | "range";

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<TimeOffEntry | null>(null);
  const [isReadMode, setIsReadMode] = React.useState(false);

  // Data fetching
  const entriesQuery = useCalendarEntries(monthStartISO, monthEndISO);
  const upcomingQuery = useUpcomingDaysOff(90);

  // Mutations
  const createMutation = useCreateCalendarEntry();
  const updateMutation = useUpdateCalendarEntry();
  const deleteMutation = useDeleteCalendarEntry();

  // UI state
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<CalendarEntry | null>(null);
  const [isReadMode, setIsReadMode] = React.useState(false);
  const [dateRangeMode, setDateRangeMode] = React.useState<DateRangeMode>("single");
  const [formData, setFormData] = React.useState({
    name: "",
    type: "Holiday" as CalendarEntryType,
    description: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    country: ["all"],
    team: ["all"],
    appliesTo: "All" as CalendarAppliesTo,
  });

  // Hooks
  // We fetch a wide range to cover both the calendar view and the upcoming list
  // Ideally these would be two separate queries but for simplicity we'll fetch a larger chunk
  // Or utilize query caching.
  // Let's fetch specifically for the current view + 3 months
  const queryStart = React.useMemo(() => subMonths(startOfMonth(currentDate), 1), [currentDate]);
  const queryEnd = React.useMemo(() => addMonths(endOfMonth(currentDate), 3), [currentDate]);
  
  const { data: timeOffEntries = [] } = useCalendarEntries(queryStart, queryEnd);
  
  const createMutation = useCreateCalendarEntry();
  const updateMutation = useUpdateCalendarEntry();
  const deleteMutation = useDeleteCalendarEntry();
  
  // Keyboard event listener for Shift key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get entries for a specific date
  const getEntriesForDate = (date: Date) => {
    return timeOffEntries.filter(entry => {
      const entryStart = new Date(entry.startDate);
      const entryEnd = new Date(entry.endDate);
      entryStart.setHours(0, 0, 0, 0);
      entryEnd.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= entryStart && checkDate <= entryEnd;
    });
  };


  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      isSameDay(new Date(selectedDate), date)
    );
  };

  const calculateAffectedCount = (countries: string[], teams: string[], appliesTo: string): number => {
    // Mock calculation - in real app, this would call an API
    if (countries.includes("all") && teams.includes("all")) {
      return appliesTo === "All" ? 127 : appliesTo === "Contractors" ? 85 : 42;
    }
    if (countries.includes("all")) {
      return appliesTo === "All" ? 87 : appliesTo === "Contractors" ? 58 : 29;
    }
    if (countries.includes("jm")) {
      return appliesTo === "All" ? 24 : appliesTo === "Contractors" ? 16 : 8;
    }
    return appliesTo === "All" ? 24 : appliesTo === "Contractors" ? 16 : 8;
  };

  const affectedCount = React.useMemo(() => {
    return calculateAffectedCount(formData.country, formData.team, formData.appliesTo);
  }, [formData.country, formData.team, formData.appliesTo]);

  const handleDateClick = (date: Date, entries: TimeOffEntry[]) => {
    // If there's an entry, open it in read mode
    if (entries.length > 0) {
      handleEditEntry(entries[0], true);
      return;
    }

    // Otherwise, handle date selection for inline editing
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    if (isShiftPressed && rangeStart) {
      // Range selection
      const start = new Date(rangeStart);
      const end = new Date(normalizedDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const rangeDates: Date[] = [];
      const current = new Date(start);
      
      if (start <= end) {
        while (current <= end) {
          rangeDates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      } else {
        while (current >= end) {
          rangeDates.push(new Date(current));
          current.setDate(current.getDate() - 1);
        }
      }
      
      // Handle date-range entries
      if (entry.startDate && entry.endDate) {
        const start = parseISO(entry.startDate);
        const end = parseISO(entry.endDate);
        return date >= start && date <= end;
      }
      
      return false;
    });
  };

  // Handlers
  const handleAddTimeOff = () => {
    setEditingEntry(null);
    setIsReadMode(false);
    setFormData({
      name: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      country: "",
      teamId: "",
      appliesToAllTeams: true,
    });
    setDateRangeMode("single");
    setDrawerOpen(true);
  };

  const handleEditEntry = (entry: CalendarEntry, readOnly = false) => {
    setEditingEntry(entry);
    setIsReadMode(readOnly);
    setFormData({
      name: entry.name,
      date: entry.date || format(new Date(), "yyyy-MM-dd"),
      startDate: entry.startDate || format(new Date(), "yyyy-MM-dd"),
      endDate: entry.endDate || format(new Date(), "yyyy-MM-dd"),
      country: entry.country || "",
      teamId: entry.teamId || "",
      appliesToAllTeams: entry.appliesToAllTeams ?? true,
    });
    setDateRangeMode(entry.startDate && entry.endDate ? "range" : "single");
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name for this time off");
      return;
    }

    try {
      const input: CreateCalendarEntryInput = {
        name: formData.name,
        country: formData.country || null,
        teamId: formData.teamId || null,
        appliesToAllTeams: formData.appliesToAllTeams,
      };

      if (dateRangeMode === "single") {
        input.date = formData.date;
      } else {
        input.startDate = formData.startDate;
        input.endDate = formData.endDate;
      }

    const entryData = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      startDate: formData.startDate,
      endDate: dateRangeMode === "single" ? formData.startDate : formData.endDate,
      country: formData.country,
      team: formData.team,
      appliesTo: formData.appliesTo,
      affectedCount: count,
    };

    if (editingEntry) {
      updateMutation.mutate({
        ...entryData,
        id: editingEntry.id,
      }, {
        onSuccess: () => {
           setDrawerOpen(false);
        }
      });
    } else {
      createMutation.mutate(entryData, {
        onSuccess: () => {
          setDrawerOpen(false);
        }
      });
    }

    setSelectedDates([]);
    setRangeStart(null);
  };

  const handleDelete = async () => {
    if (!editingEntry) return;

    deleteMutation.mutate(editingEntry.id, {
      onSuccess: () => {
        setDrawerOpen(false);
      }
    });
  };

  const getEntryColor = (type: string) => {
    if (type === "Holiday") return "bg-green-50 border-l-4 border-l-green-500";
    if (type === "Special Time Off") return "bg-blue-50 border-l-4 border-l-blue-500";
    return "bg-yellow-50 border-l-4 border-l-yellow-500";
  };

  const handleDateClick = (_date: Date, entries: CalendarEntry[]) => {
    if (entries.length > 0) {
      handleEditEntry(entries[0], true);
    }
  };

  const handleUpcomingItemClick = (entry: CalendarEntry) => {
    // Open the entry details
    // Note: Could navigate to the month containing this entry by adding
    // a setCurrentDate method to useAdminCalendarState hook
    setTimeout(() => {
      handleEditEntry(entry, true);
    }, 100);
  };

  // Loading state
  if (entriesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (entriesQuery.error) {
    const error = entriesQuery.error as any;
    const isAccessDenied = error?.code === 'PGRST301' || error?.message?.includes('permission');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isAccessDenied ? "Access Denied" : "Error Loading Calendar"}
          </h2>
          <p className="text-gray-600 mb-4">
            {isAccessDenied 
              ? "You don't have permission to access the calendar. Admin access required."
              : "Failed to load calendar data. Please try again."}
          </p>
          {!isAccessDenied && (
            <Button onClick={() => entriesQuery.refetch()} className="bg-purple-600 hover:bg-purple-700">
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  const entries = entriesQuery.data || [];
  const upcomingEntries = upcomingQuery.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-gray-900 mb-1">Calendar</h1>
            <p className="text-sm text-gray-600">
              Manage holidays and special time off that affect employee submissions
            </p>
          </div>
          <Button
            onClick={handleAddTimeOff}
            className="bg-purple-600 hover:bg-purple-700 h-10"
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Add Time Off
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goPrevMonth}
                    className="h-9 w-9 rounded-lg border-gray-200 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {format(currentDate, "MMMM yyyy")}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goNextMonth}
                    className="h-9 w-9 rounded-lg border-gray-200 hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                    className={viewMode === "month" ? "bg-purple-600 hover:bg-purple-700" : "border-gray-200"}
                  >
                    Month
                  </Button>
                  <Button
                    variant={viewMode === "year" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("year")}
                    className={viewMode === "year" ? "bg-purple-600 hover:bg-purple-700" : "border-gray-200"}
                  >
                    Year
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              {viewMode === "month" && (
                <div className="space-y-4">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                      <div key={day} className="text-center font-medium text-sm text-gray-600 pb-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map(day => {
                      const dayEntries = getEntriesForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => handleDateClick(day, dayEntries)}
                          className={`
                            min-h-[120px] rounded-lg border p-2 transition-all cursor-pointer
                            ${!isCurrentMonth ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"}
                            ${isToday ? "ring-2 ring-purple-500 ring-offset-2" : ""}
                            ${dayEntries.length === 0 ? "hover:bg-gray-50" : ""}
                          `}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-medium ${
                              isCurrentMonth ? "text-gray-900" : "text-gray-400"
                            }`}>
                              {format(day, "d")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {dayEntries.map(entry => (
                              <div
                                key={entry.id}
                                className="bg-green-50 border-l-4 border-l-green-500 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity group relative"
                              >
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  <span className="font-medium text-gray-900 truncate">
                                    {entry.name}
                                  </span>
                                </div>
                                
                                {/* Tooltip */}
                                <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-[200px]">
                                  <div className="font-semibold mb-1">{entry.name}</div>
                                  {entry.affectedContractorCount !== null && (
                                    <div className="text-gray-400">
                                      Affects {entry.affectedContractorCount} contractors
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {entries.length === 0 && (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <CalendarPlus className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-4">No holidays or time off added yet</p>
                      <Button onClick={handleAddTimeOff} className="bg-purple-600 hover:bg-purple-700">
                        Add Time Off
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Year View Placeholder */}
              {viewMode === "year" && (
                <div className="text-center py-16">
                  <p className="text-gray-600">Year view coming soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Days Off Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Upcoming Days Off</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Next 90 days</p>

              {upcomingQuery.isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : upcomingEntries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <CalendarIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">No upcoming time off</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {upcomingEntries.map(entry => {
                    const displayDate = entry.date 
                      ? format(parseISO(entry.date), "MMM d, yyyy")
                      : entry.startDate && entry.endDate
                        ? `${format(parseISO(entry.startDate), "MMM d")} - ${format(parseISO(entry.endDate), "MMM d, yyyy")}`
                        : "Date TBD";

                    const scopeLabel = entry.appliesToAllTeams 
                      ? "All Teams"
                      : entry.teamName || "Specific Team";

                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleUpcomingItemClick(entry)}
                        className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900 mb-1 group-hover:text-purple-700">
                              {entry.name}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              {displayDate}
                            </div>
                          </div>
                          <div className="w-2 h-2 rounded-full mt-1.5 bg-green-500" />
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {scopeLabel}{entry.country && ` · ${entry.country}`}
                        </div>
                        {entry.affectedContractorCount !== null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Info className="w-3 h-3" />
                            <span>Affects {entry.affectedContractorCount} contractors</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Off Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[440px] p-0 bg-white border-l border-gray-200 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-5 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-lg font-semibold text-gray-900">
                  {isReadMode ? "Time Off Details" : editingEntry ? "Edit Time Off" : "Add Time Off"}
                </SheetTitle>
                <SheetDescription className="text-sm text-gray-500 mt-1">
                  {isReadMode ? "View details of this time off entry" : "Enter details for the time off entry"}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Read Mode */}
            {isReadMode && editingEntry && (
              <div className="space-y-6">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Name</Label>
                  <div className="font-medium text-gray-900">{editingEntry.name}</div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Date</Label>
                  <div className="font-medium text-gray-900">
                    {editingEntry.date 
                      ? format(parseISO(editingEntry.date), "MMM d, yyyy")
                      : editingEntry.startDate && editingEntry.endDate
                        ? `${format(parseISO(editingEntry.startDate), "MMM d, yyyy")} - ${format(parseISO(editingEntry.endDate), "MMM d, yyyy")}`
                        : "Date TBD"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Scope</Label>
                  <div className="text-sm text-gray-700">
                    {editingEntry.appliesToAllTeams ? "All Teams" : editingEntry.teamName || "Specific Team"}
                    {editingEntry.country && ` • ${editingEntry.country}`}
                  </div>
                </div>
                {editingEntry.affectedContractorCount !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900 text-sm">
                        Affects {editingEntry.affectedContractorCount} contractors
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-4 flex gap-3">
                  <Button
                    onClick={() => setIsReadMode(false)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 border-gray-200"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Edit Mode */}
            {!isReadMode && (
              <>
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-900 mb-1.5 block">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., New Year's Day"
                    className="border-gray-200"
                  />
                </div>

                {/* Date Selection */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-900">Date Selection</Label>
                  
                  <div className="bg-gray-50 p-1 rounded-lg inline-flex w-full">
                    <button
                      onClick={() => setDateRangeMode("single")}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        dateRangeMode === "single"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Single Day
                    </button>
                    <button
                      onClick={() => setDateRangeMode("range")}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        dateRangeMode === "range"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Date Range
                    </button>
                  </div>

                  {dateRangeMode === "single" ? (
                    <div>
                      <Label htmlFor="date" className="text-xs text-gray-700 mb-1.5 block">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="border-gray-200"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="startDate" className="text-xs text-gray-700 mb-1.5 block">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                          className="border-gray-200"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-xs text-gray-700 mb-1.5 block">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                          className="border-gray-200"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Country */}
                <div>
                  <Label htmlFor="country" className="text-sm font-medium text-gray-900 mb-1.5 block">
                    Country (Optional)
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., United States"
                    className="border-gray-200"
                  />
                </div>

                {/* Scope */}
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">Applies To</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.appliesToAllTeams}
                        onChange={() => setFormData({ ...formData, appliesToAllTeams: true, teamId: "" })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">All Teams</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.appliesToAllTeams}
                        onChange={() => setFormData({ ...formData, appliesToAllTeams: false })}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-gray-700">Specific Team</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 border-gray-200"
                    >
                      Cancel
                    </Button>
                  </div>
                  {editingEntry && (
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {deleteMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Time Off
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
