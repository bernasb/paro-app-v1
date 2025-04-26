
import { useState, useEffect } from "react";
import { getSaintsAndHistory } from "@/utils/magisterium";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History, UserSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { SaintOfTheDay, HistoricalEvent } from "@/utils/magisterium/types";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext"; // Import the auth hook

export default function SaintsHistory() {
  const [saint, setSaint] = useState<SaintOfTheDay | null>(null);
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Renamed to avoid conflict with auth loading
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useGoogleAuth(); // Get auth state

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const data = await getSaintsAndHistory();
        setSaint(data.saintOfTheDay || null);
        setEvents(data.historicalEvents || []);
      } catch (err: unknown) {
        let errorMessage = "Failed to fetch Saints & History data.";
        if (err instanceof Error) {
          // Keep the specific auth error if it exists
          errorMessage = err.message.includes("Authentication required") 
            ? err.message
            : "Could not fetch Saints/History data: " + err.message;
        }
        console.error("Error fetching saints/history:", err);
        setError(errorMessage);
        // Don't show toast for auth errors, as it's expected if not logged in
        if (!errorMessage.includes("Authentication required")) {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setLoadingData(false);
      }
    };

    // Only fetch data if authentication check is complete AND user is authenticated
    if (!authLoading) { 
      if (isAuthenticated) {
        fetchData();
      } else {
        // If not authenticated after check, set specific error and stop loading
        setError("Authentication required to view Saints & History.");
        setLoadingData(false);
        setSaint(null); // Clear any potentially stale data
        setEvents([]); // Clear any potentially stale data
      }
    }
  // Depend on auth state: runs when loading finishes or auth status changes
  }, [isAuthenticated, authLoading, toast]); 

  // Show loading skeleton if either auth check or data fetching is in progress
  const isLoading = authLoading || loadingData;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">On This Day in History</h1>

      {isLoading ? (
        <div className="space-y-4">
          {/* Saint Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/2 mb-1" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          {/* Events Skeleton */}
          <Card>
            <CardHeader>
               <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
            </CardContent>
          </Card>
        </div>
      ) : error ? (
         <Card>
            <CardContent className="p-6">
                <div className="text-destructive text-center">
                    <p><strong>Error:</strong> {error}</p>
                     {/* Optionally suggest login if the error is auth-related */}
                     {error.includes("Authentication required") && 
                       <p className="text-sm text-muted-foreground mt-2">Please sign in to access this feature.</p>
                     }
                </div>
            </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Saint of the Day Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserSquare className="h-5 w-5 text-clergy-primary" />
                Saint / Feast of the Day
              </CardTitle>
              {saint && saint.name ? (
                 <CardDescription>{saint.feastType ? `(${saint.feastType})` : ''}</CardDescription>
              ) : (
                 <CardDescription>No specific saint commemorated today.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {saint && saint.name ? (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{saint.name}</h3>
                  {(saint.bornYear || saint.deathYear) && (
                    <p className="text-sm text-muted-foreground">
                       {saint.bornYear ?? '??'} - {saint.deathYear ?? '??'}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{saint.description}</p>
                </div>
              ) : (
                 <p className="text-sm text-muted-foreground">Today might be a Feria in Ordinary Time or within a special liturgical season.</p>
              )}
            </CardContent>
          </Card>

          {/* Historical Events Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <History className="h-5 w-5 text-clergy-secondary" />
                Historical Events
              </CardTitle>
              <CardDescription>Notable events in Church history on this date.</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <ul className="space-y-4">
                  {events.map((event, index) => (
                    <li key={index} className="space-y-1">
                      <h4 className="font-semibold">{event.year}: {event.event}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                      {index < events.length - 1 && <Separator className="my-2" />} 
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No specific historical events available for this date.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
