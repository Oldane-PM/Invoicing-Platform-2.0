import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Combobox } from "./Combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "../ui/sheet";
import { toast } from "sonner";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isAfter, isBefore, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarPlus, X, Info, Trash2, CalendarCheck, Calendar as CalendarIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface TimeOffEntry {
  id: string;
  name: string;
  type: "Holiday" | "Special Time Off";
  description?: string;
  startDate: Date;
  endDate: Date;
  country: string[];
  team: string[];
  appliesTo: "Contractors" | "Employees" | "All";
  affectedCount: number;
}

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

const mockTimeOffEntries: TimeOffEntry[] = [
  {
    id: "1",
    name: "New Year's Day",
    type: "Holiday",
    description: "Public holiday",
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 1),
    country: ["all"],
    team: ["all"],
    appliesTo: "All",
    affectedCount: 127,
  },
  {
    id: "2",
    name: "Martin Luther King Jr. Day",
    type: "Holiday",
    description: "Federal holiday",
    startDate: new Date(2026, 0, 19),
    endDate: new Date(2026, 0, 19),
    country: ["us"],
    team: ["all"],
    appliesTo: "All",
    affectedCount: 87,
  },
  {
    id: "3",
    name: "Presidents' Day",
    type: "Holiday",
    description: "Federal holiday",
    startDate: new Date(2026, 1, 16),
    endDate: new Date(2026, 1, 16),
    country: ["us"],
    team: ["all"],
    appliesTo: "All",
    affectedCount: 87,
  },
  {
    id: "4",
    name: "Memorial Day",
    type: "Holiday",
    description: "Federal holiday",
    startDate: new Date(2026, 4, 25),
    endDate: new Date(2026, 4, 25),
    country: ["us"],
    team: ["all"],
    appliesTo: "All",
    affectedCount: 87,
  },
  {
    id: "5",
    name: "Labour Day",
    type: "Holiday",
    description: "Public holiday",
    startDate: new Date(2026, 4, 23),
    endDate: new Date(2026, 4, 23),
    country: ["jm"],
    team: ["all"],
    appliesTo: "All",
    affectedCount: 24,
  },
];

type ViewMode = "month" | "year";
type DateRangeMode = "single" | "range";

export function AdminCalendar() {
  const [currentDate, setCurrentDate] = React.useState(new Date(2026, 0, 1));
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [timeOffEntries, setTimeOffEntries] = React.useState<TimeOffEntry[]>(mockTimeOffEntries);
  const [editingEntry, setEditingEntry] = React.useState<TimeOffEntry | null>(null);
  const [isReadMode, setIsReadMode] = React.useState(false);

  // Date selection state for inline editing
  const [selectedDates, setSelectedDates] = React.useState<Date[]>([]);
  const [rangeStart, setRangeStart] = React.useState<Date | null>(null);
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);

  // Form state
  const [dateRangeMode, setDateRangeMode] = React.useState<DateRangeMode>("single");
  const [formData, setFormData] = React.useState({
    name: "",
    type: "Holiday" as "Holiday" | "Special Time Off",
    description: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    country: ["all"],
    team: ["all"],
    appliesTo: "All" as "Contractors" | "Employees" | "All",
  });

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

  const calculateAffectedCount = (countries: string[], teams: string[], appliesTo: string) => {
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

      setSelectedDates(rangeDates);
      setRangeStart(null);
      
      const count = rangeDates.length;
      toast.info(`${count} date${count !== 1 ? 's' : ''} selected`);
    } else {
      // Single or multiple discrete date selection
      const isSelected = isDateSelected(date);
      
      if (isSelected) {
        // Deselect
        setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)));
        setRangeStart(null);
      } else {
        // Select (add to existing selection for multi-select)
        setSelectedDates(prev => [...prev, normalizedDate]);
        setRangeStart(normalizedDate);
        
        toast.info(`Date selected`);
      }
    }
  };

  const handleAddTimeOffFromSelection = () => {
    if (selectedDates.length === 0) return;

    // Sort dates
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    setEditingEntry(null);
    setIsReadMode(false);
    setFormData({
      name: "",
      type: "Holiday",
      description: "",
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      country: ["all"],
      team: ["all"],
      appliesTo: "All",
    });
    setDateRangeMode(selectedDates.length === 1 ? "single" : "range");
    setDrawerOpen(true);
  };

  const handleClearSelection = () => {
    setSelectedDates([]);
    setRangeStart(null);
    toast.info("Selection cleared");
  };

  const handleAddTimeOff = () => {
    setSelectedDates([]);
    setRangeStart(null);
    setEditingEntry(null);
    setIsReadMode(false);
    setFormData({
      name: "",
      type: "Holiday",
      description: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      country: ["all"],
      team: ["all"],
      appliesTo: "All",
    });
    setDateRangeMode("single");
    setDrawerOpen(true);
  };

  const handleEditEntry = (entry: TimeOffEntry, readOnly = false) => {
    setSelectedDates([]);
    setRangeStart(null);
    setEditingEntry(entry);
    setIsReadMode(readOnly);
    setFormData({
      name: entry.name,
      type: entry.type,
      description: entry.description || "",
      startDate: format(entry.startDate, "yyyy-MM-dd"),
      endDate: format(entry.endDate, "yyyy-MM-dd"),
      country: entry.country,
      team: entry.team,
      appliesTo: entry.appliesTo,
    });
    setDateRangeMode(
      isSameDay(entry.startDate, entry.endDate) ? "single" : "range"
    );
    setDrawerOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name for this time off");
      return;
    }

    const count = calculateAffectedCount(formData.country, formData.team, formData.appliesTo);

    if (count === 0) {
      toast.error("No contractors match this scope.");
      return;
    }

    const newEntry: TimeOffEntry = {
      id: editingEntry?.id || `${Date.now()}`,
      name: formData.name,
      type: formData.type,
      description: formData.description,
      startDate: new Date(formData.startDate),
      endDate: dateRangeMode === "single" ? new Date(formData.startDate) : new Date(formData.endDate),
      country: formData.country,
      team: formData.team,
      appliesTo: formData.appliesTo,
      affectedCount: count,
    };

    if (editingEntry) {
      setTimeOffEntries(prev => prev.map(e => e.id === editingEntry.id ? newEntry : e));
      toast.success(`Time off updated. ${count} contractors affected.`);
    } else {
      setTimeOffEntries(prev => [...prev, newEntry]);
      toast.success(`Time off added. ${count} contractors affected.`);
    }

    setSelectedDates([]);
    setRangeStart(null);
    setDrawerOpen(false);
  };

  const handleDelete = () => {
    if (!editingEntry) return;

    setTimeOffEntries(prev => prev.filter(e => e.id !== editingEntry.id));
    toast.success(`Time off removed. ${editingEntry.affectedCount} contractors no longer affected.`);
    setDrawerOpen(false);
  };

  const getEntryColor = (type: string) => {
    if (type === "Holiday") return "bg-green-50 border-l-4 border-l-green-500";
    if (type === "Special Time Off") return "bg-blue-50 border-l-4 border-l-blue-500";
    return "bg-yellow-50 border-l-4 border-l-yellow-500";
  };

  const getEntryDotColor = (type: string) => {
    if (type === "Holiday") return "bg-green-500";
    if (type === "Special Time Off") return "bg-blue-500";
    return "bg-yellow-500";
  };

  // Get upcoming days off (next 90 days)
  const upcomingDaysOff = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ninetyDaysFromNow = addDays(today, 90);

    return timeOffEntries
      .filter(entry => {
        const entryDate = new Date(entry.startDate);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate >= today && entryDate <= ninetyDaysFromNow;
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [timeOffEntries]);

  const handleUpcomingItemClick = (entry: TimeOffEntry) => {
    // Scroll to the month containing this entry
    setCurrentDate(new Date(entry.startDate));
    // Open the entry details
    setTimeout(() => {
      handleEditEntry(entry, true);
    }, 100);
  };

  const getCountryLabel = (countries: string[]) => {
    if (countries.includes("all")) return "All Countries";
    const country = mockCountries.find(c => c.value === countries[0]);
    return country?.label || countries[0];
  };

  const getTeamLabel = (teams: string[]) => {
    if (teams.includes("all")) return "All Teams";
    const team = mockTeams.find(t => t.value === teams[0]);
    return team?.label || teams[0];
  };

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
              {/* Selection Banner */}
              {selectedDates.length > 0 && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900 text-sm">
                          {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected – changes not saved
                        </div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          Click dates to select • Shift+Click for range • {affectedCount} contractors affected
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddTimeOffFromSelection}
                        className="bg-blue-600 hover:bg-blue-700 h-8"
                      >
                        Add Time Off
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearSelection}
                        className="h-8 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={previousMonth}
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
                    onClick={nextMonth}
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
                      const entries = getEntriesForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = isDateSelected(day);

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => handleDateClick(day, entries)}
                          className={`
                            min-h-[120px] rounded-lg border p-2 transition-all cursor-pointer
                            ${!isCurrentMonth ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"}
                            ${isToday && !isSelected ? "ring-2 ring-purple-500 ring-offset-2" : ""}
                            ${isSelected ? "ring-2 ring-blue-500 bg-blue-50 border-blue-300" : ""}
                            ${entries.length === 0 && !isSelected ? "hover:bg-gray-50" : ""}
                          `}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-medium ${
                              isCurrentMonth ? "text-gray-900" : "text-gray-400"
                            } ${isSelected ? "text-blue-700" : ""}`}>
                              {format(day, "d")}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            {entries.map(entry => (
                              <div
                                key={entry.id}
                                className={`
                                  ${getEntryColor(entry.type)}
                                  px-2 py-1 rounded text-xs
                                  hover:opacity-80 transition-opacity
                                  group relative
                                `}
                              >
                                <div className="flex items-center gap-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${getEntryDotColor(entry.type)}`} />
                                  <span className="font-medium text-gray-900 truncate">
                                    {entry.name}
                                  </span>
                                </div>
                                
                                {/* Tooltip */}
                                <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-[200px]">
                                  <div className="font-semibold mb-1">{entry.name}</div>
                                  <div className="text-gray-300 mb-1">{entry.type}</div>
                                  <div className="text-gray-400">
                                    Affects {entry.affectedCount} contractors
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty State */}
                  {timeOffEntries.length === 0 && (
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

              {upcomingDaysOff.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                    <CalendarIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">No upcoming time off</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {upcomingDaysOff.map(entry => (
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
                            {isSameDay(entry.startDate, entry.endDate)
                              ? format(entry.startDate, "MMM d, yyyy")
                              : `${format(entry.startDate, "MMM d")} - ${format(entry.endDate, "MMM d, yyyy")}`
                            }
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${getEntryDotColor(entry.type)}`} />
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {getCountryLabel(entry.country)} · {getTeamLabel(entry.team)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Info className="w-3 h-3" />
                        <span>Affects {entry.affectedCount} contractors</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Off Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[440px] p-0 bg-white border-l border-gray-200 overflow-y-auto">
          {/* Drawer Header */}
          <SheetHeader className="px-6 pt-6 pb-5 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isReadMode ? "Time Off Details" : editingEntry ? "Edit Time Off" : "Add Time Off"}
              </h2>
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
                  <Label className="text-xs text-gray-500 mb-1 block">Type</Label>
                  <div className="font-medium text-gray-900">{editingEntry.type}</div>
                </div>
                {editingEntry.description && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Description</Label>
                    <div className="text-sm text-gray-700">{editingEntry.description}</div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Date</Label>
                  <div className="font-medium text-gray-900">
                    {isSameDay(editingEntry.startDate, editingEntry.endDate)
                      ? format(editingEntry.startDate, "MMM d, yyyy")
                      : `${format(editingEntry.startDate, "MMM d, yyyy")} - ${format(editingEntry.endDate, "MMM d, yyyy")}`
                    }
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Scope</Label>
                  <div className="text-sm text-gray-700">
                    {getCountryLabel(editingEntry.country)} • {getTeamLabel(editingEntry.team)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Applies To</Label>
                  <div className="font-medium text-gray-900">{editingEntry.appliesTo}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-900 text-sm">
                      Affects {editingEntry.affectedCount} contractors
                    </div>
                  </div>
                </div>
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
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                        className="bg-gray-50 border-gray-200 rounded-lg h-10"
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
                          className="bg-gray-50 border-gray-200 rounded-lg h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-xs text-gray-700 mb-1.5 block">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                          className="bg-gray-50 border-gray-200 rounded-lg h-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Off Details */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-900">Time Off Details</Label>
                  
                  <div>
                    <Label htmlFor="type" className="text-xs text-gray-700 mb-1.5 block">Type</Label>
                    <Combobox
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as "Holiday" | "Special Time Off" })}
                      options={[
                        { value: "Holiday", label: "Holiday" },
                        { value: "Special Time Off", label: "Special Time Off" },
                      ]}
                      placeholder="Select type"
                    />
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-xs text-gray-700 mb-1.5 block">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. National Holiday"
                      className="bg-gray-50 border-gray-200 rounded-lg h-10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-xs text-gray-700 mb-1.5 block">
                      Description <span className="text-gray-400">(Optional)</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add additional details..."
                      rows={3}
                      className="bg-gray-50 border-gray-200 rounded-lg resize-none"
                    />
                  </div>
                </div>

                {/* Scope & Applicability */}
                <div className="space-y-4 pt-2 border-t border-gray-200">
                  <Label className="text-sm font-medium text-gray-900">Scope & Applicability</Label>
                  
                  <div>
                    <Label htmlFor="country" className="text-xs text-gray-700 mb-1.5 block">Country</Label>
                    <Combobox
                      value={formData.country[0]}
                      onValueChange={(value) => setFormData({ ...formData, country: [value] })}
                      options={mockCountries}
                      placeholder="Select country"
                    />
                  </div>

                  <div>
                    <Label htmlFor="team" className="text-xs text-gray-700 mb-1.5 block">Team</Label>
                    <Combobox
                      value={formData.team[0]}
                      onValueChange={(value) => setFormData({ ...formData, team: [value] })}
                      options={mockTeams}
                      placeholder="Select team"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-700 mb-2 block">Applies To</Label>
                    <RadioGroup
                      value={formData.appliesTo}
                      onValueChange={(value) => setFormData({ ...formData, appliesTo: value as "Contractors" | "Employees" | "All" })}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="All" id="all" />
                          <Label htmlFor="all" className="font-normal cursor-pointer">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Contractors" id="contractors" />
                          <Label htmlFor="contractors" className="font-normal cursor-pointer">Contractors</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Employees" id="employees" />
                          <Label htmlFor="employees" className="font-normal cursor-pointer">Employees</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Affected Contractors Indicator */}
                <div className={`${
                  affectedCount === 0 ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"
                } border rounded-lg p-4 flex items-start gap-3`}>
                  <Info className={`w-5 h-5 ${affectedCount === 0 ? "text-yellow-600" : "text-blue-600"} flex-shrink-0 mt-0.5`} />
                  <div>
                    <div className={`font-medium text-sm ${affectedCount === 0 ? "text-yellow-900" : "text-blue-900"}`}>
                      {affectedCount === 0
                        ? "No contractors match the selected scope"
                        : `This time off will affect ${affectedCount} contractors`
                      }
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      disabled={affectedCount === 0}
                    >
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
                      variant="ghost"
                      onClick={handleDelete}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
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
