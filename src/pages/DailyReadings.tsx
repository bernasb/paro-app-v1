// DailyReadings.tsx

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { ReadingCard } from '@/components/liturgical/ReadingCard';
import { getDailyMassReadings, getReadingSummary } from '@/services/liturgical/liturgicalService';
import { saveSummaryToCache } from '@/services/liturgical/readingSummariesCache';
import { LiturgicalReading } from '@/types/liturgical';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Removed Firebase httpsCallable imports
// import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
// import app from '@/integrations/firebase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Book, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import pLimit from 'p-limit';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Helper function to generate date string
const getDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const DailyReadings = () => {
  const { toast } = useToast();
  const [readings, setReadings] = useState<LiturgicalReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userReady, setUserReady] = useState<boolean>(false);

  // Wait for Firebase user to be loaded before fetching readings
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserReady(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Define the fetch function using useCallback to memoize it
  const fetchReadings = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    console.log(`Fetching readings for ${getDateString(date)}`);
    try {
      // Fetch initial readings (already includes loading state for summaries)
      const fetchedReadings = await getDailyMassReadings(date);
      console.log(`Fetched ${fetchedReadings.length} initial readings.`);
      // Log each reading for debugging
      console.log('Readings received from API:');
      fetchedReadings.forEach((reading, index) => {
        console.log(`Reading ${index + 1}: "${reading.title}" (${reading.citation})`);
      });
      setReadings(fetchedReadings);
      setLoading(false); // Set loading false after initial fetch

      // Asynchronously fetch summaries with limited concurrency for faster loading and less timeout risk
      console.log('Starting limited-concurrency summary fetching...');
      const limit = pLimit(2); // Change this number to adjust concurrency

      // Get Firebase ID token ONCE for all summary requests
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setError('You must be signed in to view summaries.');
        return;
      }
      const idToken = await user.getIdToken();

      // First, mark Gospel Acclamation readings as not needing summaries
      const readingsToUpdate = [...fetchedReadings];
      fetchedReadings.forEach((reading, index) => {
        if (reading.title.toLowerCase().includes('gospel acclamation')) {
          readingsToUpdate[index] = {
            ...reading,
            summaryLoading: false,
          };
        }
      });
      setReadings(readingsToUpdate);

      // Fetch summaries with concurrency limit and update UI as each arrives
      await Promise.all(
        fetchedReadings
          .filter((reading) => !reading.title.toLowerCase().includes('gospel acclamation'))
          .map((reading) =>
            limit(async () => {
              try {
                console.log(`Requesting summary for: ${reading.title}`);
                // Pass idToken to getReadingSummary
                const summaryResult = await getReadingSummary({
                  title: reading.title,
                  citation: reading.citation,
                  idToken,
                });
                console.log(`Summary received for: ${reading.title}`);
                setReadings((prevReadings) => {
                  const updatedReadings = [...prevReadings];
                  const index = updatedReadings.findIndex(
                    (r) => r.title === reading.title && r.citation === reading.citation,
                  );
                  if (index !== -1) {
                    updatedReadings[index] = {
                      ...updatedReadings[index],
                      summary: summaryResult.summary,
                      detailedExplanation: summaryResult.detailedExplanation,
                      citations: summaryResult.citations || [],
                      summaryLoading: false,
                      summaryError: undefined,
                    };
                  }
                  return updatedReadings;
                });
              } catch (summaryError: any) {
                console.error(`Error fetching summary for ${reading.title}:`, summaryError);
                setReadings((prevReadings) => {
                  const updatedReadings = [...prevReadings];
                  const index = updatedReadings.findIndex(
                    (r) => r.title === reading.title && r.citation === reading.citation,
                  );
                  if (index !== -1) {
                    updatedReadings[index] = {
                      ...updatedReadings[index],
                      summaryLoading: false,
                      summaryError: summaryError.message || 'Failed to load summary.',
                    };
                  }
                  return updatedReadings;
                });
              }
            }),
          ),
      );
    } catch (err: any) {
      console.error('Error fetching daily readings:', err);
      setError(err.message || 'Failed to fetch readings.');
      setLoading(false);
    }
  }, []);

  // Fetch readings when the component mounts or selectedDate changes AND user is ready
  useEffect(() => {
    if (userReady) {
      fetchReadings(selectedDate);
    }
  }, [selectedDate, userReady, fetchReadings]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    // Main container with padding
    <div className="space-y-6 p-4 md:p-6">
      {/* Sticky Header with Blur Padding Above/Below - FIXED */}
      <div className="sticky top-0 z-30">
        {/* Blur above header */}
        <div className="absolute left-0 right-0 -top-6 h-6 bg-background/80 backdrop-blur-md pointer-events-none" />
        {/* Header container */}
        <div className="relative flex flex-row items-center justify-between mb-4 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border pb-2 px-2">
          <h1 className="text-2xl font-bold flex items-center">
            <Book className="mr-2 h-6 w-6 text-clergy-primary" />
            Daily Mass Readings
          </h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className={cn('gap-2')}
              onClick={() => {
                const formattedDate = format(selectedDate, 'MMddyy');
                const usccbUrl = `https://bible.usccb.org/bible/readings/${formattedDate}.cfm`;
                window.open(usccbUrl, '_blank');
              }}
            >
              View Mass Readings
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {/* Blur below header */}
        <div className="absolute left-0 right-0 -bottom-6 h-6 bg-background/80 backdrop-blur-md pointer-events-none" />
      </div>

      {/* Description - moved outside the flex container */}
      <p className="text-muted-foreground mb-6">
        Readings for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
      </p>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Readings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => fetchReadings(selectedDate)} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Readings Content (Tabs) */}
      {!loading && !error && (
        <Tabs defaultValue="all-readings">
          {/* Remove the TabsList as there's only one tab */}
          {/*
          <TabsList className="grid w-full grid-cols-1 mb-4">
            <TabsTrigger value="all-readings">Readings</TabsTrigger>
          </TabsList>
          */}
          <TabsContent value="all-readings" className="mt-0">
            {' '}
            {/* Added mt-0 */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
              {readings.length > 0 ? (
                readings.map((reading, index) => (
                  <ReadingCard key={`${reading.title}-${index}`} reading={reading} />
                ))
              ) : (
                <p>No readings available for this date.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DailyReadings;
