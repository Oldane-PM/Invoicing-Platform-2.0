import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";

interface MultiSelectComboboxProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function MultiSelectCombobox({
  values,
  onValuesChange,
  options,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (currentValue: string) => {
    if (values.includes(currentValue)) {
      onValuesChange(values.filter((val) => val !== currentValue));
    } else {
      onValuesChange([...values, currentValue]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full min-h-11 h-auto py-2 justify-between bg-gray-50 border-gray-200 rounded-lg",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center font-normal">
            {values.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : values.length <= 2 ? (
              // Display the labels as badges if 1 or 2 are selected
              values.map((val) => {
                const label = options.find((opt) => opt.value === val)?.label;
                return (
                  <Badge variant="secondary" key={val} className="mr-1">
                    {label}
                  </Badge>
                );
              })
            ) : (
              // Display count if > 2
              <Badge variant="secondary">{values.length} selected</Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="p-0 w-[--radix-popover-trigger-width]"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = values.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
