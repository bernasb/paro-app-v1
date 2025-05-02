import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, doc } from 'firebase/firestore';
import { getLiturgicalContext, getCurrentDateTimeInfo } from '@/utils/liturgical/calapi';

function capitalizeFirst(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function WelcomeCard() {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [userDisplayName, setUserDisplayName] = useState(() => {
    return localStorage.getItem('userDisplayName') || '';
  });
  const [quote, setQuote] = useState<string | null>(null);
  const [liturgicalContext, setLiturgicalContext] = useState<any | null>(null);
  const [tz, setTz] = useState('');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    let newGreeting = '';

    if (hour < 12) {
      newGreeting = 'Good morning';
    } else if (hour < 18) {
      newGreeting = 'Good afternoon';
    } else {
      newGreeting = 'Good evening';
    }

    setGreeting(newGreeting);

    // Format current time
    const formatTime = () => {
      const date = new Date();
      setCurrentTime(
        date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }) +
          ' - ' +
          date.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
      );
    };

    formatTime();
    const interval = setInterval(formatTime, 1000);

    // Fetch CalAPI data for today and set timezone
    const { now, tz: timezone } = getCurrentDateTimeInfo();
    setTz(timezone);
    getLiturgicalContext(now).then(setLiturgicalContext).catch(() => setLiturgicalContext(null));

    // Fetch a random quote from Firestore, but only once per day
    const fetchDailyQuote = async () => {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const saved = localStorage.getItem('dashboardQuote');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.date === today && parsed.text) {
            setQuote(parsed.text);
            return;
          }
        } catch {}
      }
      try {
        const quotesCol = collection(db, 'dashboardQuotes');
        const quoteDocs = await getDocs(quotesCol);
        const quoteArr = quoteDocs.docs.map(doc => doc.data().text).filter(Boolean);
        let chosen = '';
        if (quoteArr.length > 0) {
          chosen = quoteArr[Math.floor(Math.random() * quoteArr.length)];
        } else {
          chosen = '"Let us love, since that is what our hearts were made for." – St. Thérèse of Lisieux';
        }
        setQuote(chosen);
        localStorage.setItem('dashboardQuote', JSON.stringify({ date: today, text: chosen }));
      } catch {
        setQuote('"Let us love, since that is what our hearts were made for." – St. Thérèse of Lisieux');
      }
    };
    fetchDailyQuote();

    // Listen for changes to userDisplayName in localStorage (e.g., from Settings)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userDisplayName') {
        setUserDisplayName(event.newValue || '');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <Card className="bg-gradient-to-br from-clergy-primary/90 to-clergy-secondary/90 text-white border-none shadow-lg">
      <CardHeader className="pb-2 flex flex-row justify-between items-start">
        {/* Left Side: Greeting, Date/Time, Season, Cycles */}
        <div className="flex flex-col items-start min-w-[210px]">
          <CardTitle className="text-2xl font-bold">{greeting}, {userDisplayName || 'Father'}</CardTitle>
          <CardDescription className="text-white/80">{currentTime}</CardDescription>
          {liturgicalContext && (
            <>
              <div><span className="font-semibold">Season:</span> {liturgicalContext.liturgical_details.season.charAt(0).toUpperCase() + liturgicalContext.liturgical_details.season.slice(1)} (Week {liturgicalContext.liturgical_details.season_week})</div>
              <div><span className="font-semibold">Sunday Cycle:</span> {liturgicalContext.cycles.sunday_cycle}</div>
              <div><span className="font-semibold">Weekday Cycle:</span> {liturgicalContext.cycles.weekday_cycle}</div>
            </>
          )}
        </div>
        {/* Center: Quote and Liturgical Day */}
        <div className="flex flex-col items-center flex-1 px-4">
          <div className="italic text-lg text-center py-4">
            {quote || 'Loading inspirational quote...'}
          </div>
          <div className="text-center text-base font-semibold py-2">
            {liturgicalContext ? (
              <>
                Liturgical Day: {liturgicalContext.liturgical_day || '—'}
              </>
            ) : (
              'Loading liturgical day...'
            )}
          </div>
        </div>
        {/* Right Side: Celebration Details */}
        <div className="flex flex-col items-end min-w-[210px]">
          {liturgicalContext && liturgicalContext.liturgical_details.celebrations[0] && (
            <div>
              <div className="font-semibold">Celebration Details:</div>
              <div><span className="font-semibold">Color:</span> {capitalizeFirst(liturgicalContext.liturgical_details.celebrations[0].colour)}</div>
              <div><span className="font-semibold">Rank:</span> {capitalizeFirst(liturgicalContext.liturgical_details.celebrations[0].rank)}</div>
              <div><span className="font-semibold">Rank Number:</span> {liturgicalContext.liturgical_details.celebrations[0].rank_num}</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Empty: All header content is now in CardHeader for layout clarity */}
      </CardContent>
    </Card>
  );
}
