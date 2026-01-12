/**
 * Admin Calendar State Hook
 * 
 * Manages local state for calendar navigation and view mode.
 * No API calls - pure client-side state management.
 */

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { CalendarViewMode } from "../../data/adminCalendar/adminCalendar.types";

export function useAdminCalendarState() {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  // Computed values for month range (ISO format for queries)
  const monthStartISO = useMemo(() => {
    const start = startOfMonth(currentMonthDate);
    return format(start, "yyyy-MM-dd");
  }, [currentMonthDate]);

  const monthEndISO = useMemo(() => {
    const end = endOfMonth(currentMonthDate);
    return format(end, "yyyy-MM-dd");
  }, [currentMonthDate]);

  // Navigation functions
  const goPrevMonth = () => {
    setCurrentMonthDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goNextMonth = () => {
    setCurrentMonthDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const setMonth = (date: Date) => {
    setCurrentMonthDate(date);
  };

  return {
    currentMonthDate,
    viewMode,
    monthStartISO,
    monthEndISO,
    goPrevMonth,
    goNextMonth,
    setMonth,
    setViewMode,
  };
}
