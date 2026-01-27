/**
 * Admin Calendar State Hook
 * 
 * Manages calendar navigation state (current month, view mode).
 * Provides computed values for querying data.
 */

import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

// View mode for calendar display
type CalendarViewMode = 'month' | 'week' | 'day';

export function useAdminCalendarState() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Computed values for the current month
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  
  const monthStartISO = useMemo(
    () => monthStart.toISOString().split('T')[0],
    [monthStart]
  );
  
  const monthEndISO = useMemo(
    () => monthEnd.toISOString().split('T')[0],
    [monthEnd]
  );

  // Navigation functions
  const goPrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  return {
    currentDate,
    viewMode,
    setViewMode,
    monthStart,
    monthEnd,
    monthStartISO,
    monthEndISO,
    goPrevMonth,
    goNextMonth,
  };
}
