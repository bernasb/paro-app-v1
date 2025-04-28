import { LiturgicalEvent } from '@/utils/magisterium';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';
import { EventCard } from './EventCard';

interface LiturgicalEventsDisplayProps {
  events: LiturgicalEvent[];
  getColorClass: (color: string) => string;
  loading: boolean;
}

export const LiturgicalEventsDisplay = ({
  events,
  getColorClass,
  loading,
}: LiturgicalEventsDisplayProps) => {
  if (loading) {
    return null; // Loading state handled by parent
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No liturgical events found. Please try again later.
      </div>
    );
  }

  const today = new Date();
  const thisWeekStart = startOfWeek(today);
  const thisWeekEnd = endOfWeek(today);
  const nextWeekStart = addDays(thisWeekEnd, 1);
  const nextWeekEnd = endOfWeek(nextWeekStart);

  const thisWeekEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= thisWeekStart && eventDate <= thisWeekEnd;
  });

  const nextWeekEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= nextWeekStart && eventDate <= nextWeekEnd;
  });

  const futureEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate > nextWeekEnd;
  });

  return (
    <Tabs defaultValue="this-week" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="this-week">This Week</TabsTrigger>
        <TabsTrigger value="next-week">Next Week</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        <TabsTrigger value="all">All Events</TabsTrigger>
      </TabsList>

      <TabsContent value="this-week" className="space-y-4">
        {thisWeekEvents.length > 0 ? (
          thisWeekEvents.map((event, index) => (
            <EventCard key={index} event={event} getColorClass={getColorClass} />
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No liturgical events this week
          </div>
        )}
      </TabsContent>

      <TabsContent value="next-week" className="space-y-4">
        {nextWeekEvents.length > 0 ? (
          nextWeekEvents.map((event, index) => (
            <EventCard key={index} event={event} getColorClass={getColorClass} />
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No liturgical events next week
          </div>
        )}
      </TabsContent>

      <TabsContent value="upcoming" className="space-y-4">
        {futureEvents.length > 0 ? (
          futureEvents.map((event, index) => (
            <EventCard key={index} event={event} getColorClass={getColorClass} />
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No upcoming liturgical events found
          </div>
        )}
      </TabsContent>

      <TabsContent value="all" className="space-y-4">
        {events.map((event, index) => (
          <EventCard key={index} event={event} getColorClass={getColorClass} />
        ))}
      </TabsContent>
    </Tabs>
  );
};
