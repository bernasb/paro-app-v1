
import { useState } from "react";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import GoogleAuthForm from "@/components/google/GoogleAuthForm";

const Calendar = () => {
  const { isAuthenticated } = useGoogleAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        {isAuthenticated && (
          <Button className="gap-2 bg-clergy-primary hover:bg-clergy-primary/90">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        )}
      </div>
      
      {!isAuthenticated ? (
        <GoogleAuthForm 
          serviceName="Calendar" 
          serviceIcon={<CalendarIcon className="h-5 w-5 text-clergy-primary" />} 
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Date</CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-clergy-primary" />
                  Schedule
                </CardTitle>
                <CardDescription>Your events are synced with Google Calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-[300px] flex flex-col items-center justify-center text-muted-foreground text-center p-6">
                  <CalendarIcon className="h-12 w-12 mb-4 text-muted-foreground/60" />
                  <h3 className="text-xl font-medium mb-2">Calendar Integration</h3>
                  <p className="max-w-md">
                    Your Google Calendar is connected. In a complete implementation, your events 
                    would appear here, synced with your Google account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <h2 className="text-xl font-semibold mt-8">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 1,
                title: "Morning Mass",
                date: "Today",
                time: "8:00 AM",
                location: "St. Mary's Chapel",
              },
              {
                id: 2,
                title: "Youth Group Meeting",
                date: "Today",
                time: "4:00 PM",
                location: "Parish Hall",
              },
              {
                id: 3,
                title: "Confession",
                date: "Tomorrow",
                time: "3:00 PM",
                location: "St. Mary's Chapel",
              },
            ].map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="h-2 bg-clergy-primary"></div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg">{event.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mt-2 gap-4">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{event.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{event.location}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Calendar;
