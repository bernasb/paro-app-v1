import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin } from 'lucide-react';

// Mock data for upcoming events
const upcomingEvents = [
  {
    id: 1,
    title: 'Morning Mass',
    date: 'Today',
    time: '8:00 AM',
    location: "St. Mary's Chapel",
  },
  {
    id: 2,
    title: 'Youth Group Meeting',
    date: 'Today',
    time: '4:00 PM',
    location: 'Parish Hall',
  },
  {
    id: 3,
    title: 'Confession',
    date: 'Tomorrow',
    time: '3:00 PM',
    location: "St. Mary's Chapel",
  },
  {
    id: 4,
    title: 'Bible Study',
    date: 'In 2 days',
    time: '7:00 PM',
    location: 'Community Room',
  },
];

export function UpcomingEventsCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Calendar className="h-5 w-5 text-clergy-primary" />
          Upcoming Events
        </CardTitle>
        <CardDescription>Your schedule for the next few days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="flex flex-col p-3 rounded-md bg-accent/20 border border-border"
          >
            <h3 className="font-medium text-foreground">{event.title}</h3>
            <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{event.time}</span>
              </div>
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{event.location}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
