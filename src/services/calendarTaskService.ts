
import { Task } from "@/components/tasks/TaskDialog";
import { formatDueDateTime } from "@/utils/dateTimeUtils";

// Example calendar event interface (would come from Google Calendar API)
interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  description?: string;
}

/**
 * Convert a calendar event to a task
 */
export const calendarEventToTask = (event: CalendarEvent): Task => {
  // Parse the event start time
  const startDate = new Date(event.start.dateTime);
  
  // Format time as 12-hour AM/PM
  const hours = startDate.getHours();
  const minutes = startDate.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const time = `${hours12}:${minutes} ${period}`;
  
  // Create a due date string in our format
  const dueDate = formatDueDateTime(startDate, time, false);
  
  return {
    id: Date.now(), // Generate temporary ID
    title: event.summary,
    dueDate: dueDate,
    completed: false,
    // You could set these based on keywords or event tags
    urgent: isUrgentEvent(event),
    important: isImportantEvent(event),
  };
};

/**
 * Determine if an event should be marked as urgent based on its properties
 * This is a placeholder implementation - would need to be customized
 */
const isUrgentEvent = (event: CalendarEvent): boolean => {
  const urgentKeywords = ['urgent', 'important', 'deadline', 'due', 'asap'];
  
  // Check summary and description for urgent keywords
  const textToSearch = [
    event.summary,
    event.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  return urgentKeywords.some(keyword => textToSearch.includes(keyword));
};

/**
 * Determine if an event should be marked as important based on its properties
 * This is a placeholder implementation - would need to be customized
 */
const isImportantEvent = (event: CalendarEvent): boolean => {
  const importantKeywords = ['important', 'critical', 'key', 'primary', 'essential'];
  
  // Check summary and description for important keywords
  const textToSearch = [
    event.summary,
    event.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  return importantKeywords.some(keyword => textToSearch.includes(keyword));
};

/**
 * Filter upcoming events (0-3 days) and convert them to tasks
 * This would be called after fetching calendar events from the API
 */
export const getUpcomingCalendarTasks = (events: CalendarEvent[]): Task[] => {
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);
  
  return events
    .filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return eventDate >= now && eventDate <= threeDaysFromNow;
    })
    .map(calendarEventToTask);
};
