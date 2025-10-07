import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerDOBProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerDOB({ 
  date, 
  onSelect, 
  placeholder = "Pick a date",
  className 
}: DatePickerDOBProps) {
  const [month, setMonth] = React.useState<Date>(date || new Date(2000, 0));

  // Generate years from 1900 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
  
  // Generate months
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(year));
    setMonth(newDate);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(month);
    newDate.setMonth(parseInt(monthIndex));
    setMonth(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <div className="p-3 border-b bg-background">
          <div className="flex gap-2">
            <Select value={months[month.getMonth()]} onValueChange={handleMonthChange}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {months.map((monthName, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={month.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] z-50 bg-background">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          month={month}
          onMonthChange={setMonth}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}