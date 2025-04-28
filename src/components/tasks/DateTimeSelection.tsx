import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimeSelectionProps {
  selectedDate: Date | undefined;
  selectedTime: string;
  noDueDate: boolean;
  onDateSelect: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onNoDueDateToggle: (checked: boolean) => void;
  onClearDate: () => void;
}

export const DateTimeSelection = ({
  selectedDate,
  selectedTime,
  noDueDate,
  onDateSelect,
  onTimeChange,
  onNoDueDateToggle,
  onClearDate,
}: DateTimeSelectionProps) => {
  // Convert 24-hour time to 12-hour format with AM/PM
  const convertTo12HourFormat = (time24: string): string => {
    const [hours24, minutes] = time24.split(':').map(Number);

    const period = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;

    // Convert 0 to 12 for 12 AM
    hours12 = hours12 === 0 ? 12 : hours12;

    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Convert 12-hour time with AM/PM to 24-hour format for the time input
  const convertTo24HourFormat = (time12: string): string => {
    const [timePart, period] = time12.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert from 24-hour format (from input) to 12-hour format for display
    const time24 = e.target.value;
    const time12 = convertTo12HourFormat(time24);
    onTimeChange(time12);
  };

  // Calculate the 24-hour time value for the time input
  const getTimeInputValue = (): string => {
    if (!selectedTime) return '12:00';

    try {
      return convertTo24HourFormat(selectedTime);
    } catch (e) {
      return '12:00';
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="dueDate">Due Date & Time</Label>
        <div className="flex items-center gap-2">
          <Checkbox id="noDueDate" checked={noDueDate} onCheckedChange={onNoDueDateToggle} />
          <Label htmlFor="noDueDate" className="text-sm">
            No due date
          </Label>
        </div>
      </div>

      <div
        className={`grid grid-cols-[1fr,auto] gap-2 ${noDueDate ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground',
              )}
              disabled={noDueDate}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {selectedDate && !noDueDate && (
          <Button
            variant="outline"
            size="icon"
            onClick={onClearDate}
            className="flex-shrink-0"
            title="Clear date"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        className={`flex items-center gap-2 ${noDueDate ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="relative w-full">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="time"
            value={getTimeInputValue()}
            onChange={handleTimeChange}
            className="pl-10"
            disabled={noDueDate}
          />
        </div>
      </div>
    </div>
  );
};
