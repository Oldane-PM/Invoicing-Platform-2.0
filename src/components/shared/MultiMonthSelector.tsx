import * as React from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";

interface MultiMonthSelectorProps {
  selectedMonths: string[]; // Array of "YYYY-MM" strings
  onMonthsChange: (months: string[]) => void;
  placeholder?: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function MultiMonthSelector({
  selectedMonths,
  onMonthsChange,
  placeholder = "All Time"
}: MultiMonthSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());
  const [tempSelectedMonths, setTempSelectedMonths] = React.useState<string[]>(selectedMonths);

  // Sync temp selection with prop when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedMonths(selectedMonths);
    }
  }, [isOpen, selectedMonths]);

  const toggleMonth = (monthIndex: number) => {
    const monthKey = `${currentYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    
    setTempSelectedMonths(prev => {
      if (prev.includes(monthKey)) {
        return prev.filter(m => m !== monthKey);
      } else {
        return [...prev, monthKey].sort();
      }
    });
  };

  const isMonthSelected = (monthIndex: number) => {
    const monthKey = `${currentYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    return tempSelectedMonths.includes(monthKey);
  };

  const handleApply = () => {
    onMonthsChange(tempSelectedMonths);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempSelectedMonths([]);
  };

  const handleClearAll = () => {
    setTempSelectedMonths([]);
    onMonthsChange([]);
    setIsOpen(false);
  };

  const previousYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  const nextYear = () => {
    setCurrentYear(prev => prev + 1);
  };

  // Format display text
  const displayText = React.useMemo(() => {
    if (selectedMonths.length === 0) {
      return placeholder;
    }
    if (selectedMonths.length === 1) {
      const [year, month] = selectedMonths[0].split("-");
      return format(new Date(parseInt(year), parseInt(month) - 1, 1), "MMM yyyy");
    }
    return `${selectedMonths.length} month(s) selected`;
  }, [selectedMonths, placeholder]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 justify-start text-left font-normal bg-gray-50 border-gray-200 rounded-lg hover:bg-gray-100"
        >
          <Calendar className="mr-2 h-4 w-4 text-gray-500" />
          <span className={selectedMonths.length === 0 ? "text-gray-500" : "text-gray-900"}>
            {displayText}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Year Selector */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={previousYear}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-gray-900">
              {currentYear}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextYear}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month, index) => {
              const selected = isMonthSelected(index);
              return (
                <Button
                  key={month}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMonth(index)}
                  className={`h-9 ${
                    selected
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {month}
                </Button>
              );
            })}
          </div>

          {/* Selected Count */}
          {tempSelectedMonths.length > 0 && (
            <div className="text-xs text-gray-600 text-center">
              {tempSelectedMonths.length} month{tempSelectedMonths.length !== 1 ? "s" : ""} selected
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Apply
            </Button>
          </div>

          {/* Clear All (if already applied selections exist) */}
          {selectedMonths.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="w-full text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
