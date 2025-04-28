import { format } from 'date-fns';

/**
 * Formats a date and time as "Tuesday, 4/8/25, 3:00 PM"
 */
export const formatDueDateTime = (
  date: Date | undefined,
  time: string | null,
  noDate: boolean,
): string | null => {
  if (noDate || !date || !time) {
    return null;
  }

  // Format: "Tuesday, 4/8/25, 3:00 PM"
  const dayOfWeek = format(date, 'EEEE');
  const dateFormatted = format(date, 'M/d/yy');
  return `${dayOfWeek}, ${dateFormatted}, ${time}`;
};

/**
 * Parse a due date string into its component parts
 */
export const parseDueDateTime = (
  dueDate: string | null,
): {
  date: Date | undefined;
  time: string;
} => {
  if (!dueDate) {
    return { date: undefined, time: '12:00 PM' };
  }

  try {
    // This is a simple approach assuming the date format we're using
    const dateTimeParts = dueDate.split(', ');
    if (dateTimeParts.length >= 3) {
      const timePart = dateTimeParts[dateTimeParts.length - 1];
      return {
        date: new Date(), // Simplified for now, would need proper parsing
        time: timePart,
      };
    } else {
      return { date: undefined, time: '12:00 PM' };
    }
  } catch (e) {
    return { date: undefined, time: '12:00 PM' };
  }
};
