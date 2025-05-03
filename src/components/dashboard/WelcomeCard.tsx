import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getLiturgicalContext, getCurrentDateTimeInfo, findNextSpecialDay } from '@/utils/liturgical/calapi';
import { format, parseISO } from 'date-fns';

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
  const [nextSpecialDay, setNextSpecialDay] = useState<{ date: string; name: string; type: string } | null>(null);

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

    // Fetch next special day
    findNextSpecialDay(now, 30).then(setNextSpecialDay).catch(() => setNextSpecialDay(null));

    // Fetch a daily quote from Firestore for today, or fallback to random quote
    const fetchDailyQuote = async () => {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      console.log('[DashboardQuote] Today key:', today);
      let localQuote: string | null = null;
      const saved = localStorage.getItem('dashboardQuote');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.date === today && parsed.text) {
            localQuote = parsed.text;
          }
        } catch {}
      }
      try {
        // Always try to fetch a date-specific quote from Firestore
        const quoteDocRef = doc(db, 'dashboardQuotes', today);
        const quoteDocSnap = await getDoc(quoteDocRef);
        console.log('[DashboardQuote] Firestore doc exists:', quoteDocSnap.exists());
        if (quoteDocSnap.exists()) {
          const data = quoteDocSnap.data();
          if (!localQuote || data.text !== localQuote) {
            // Only update localStorage if quote is new or changed
            localStorage.setItem('dashboardQuote', JSON.stringify({ date: today, text: data.text }));
          }
          setQuote(data.text);
          return;
        }
        // Otherwise, fallback to localStorage cached quote if available
        if (localQuote) {
          setQuote(localQuote);
          return;
        }
        // Otherwise, fallback to random quote (only those with random: true)
        const quotesCol = collection(db, 'dashboardQuotes');
        const quoteDocs = await getDocs(quotesCol);
        const quoteArr = quoteDocs.docs
          .filter(doc => doc.data().random === true)
          .map(doc => doc.data().text)
          .filter(Boolean);
        let chosen = '';
        if (quoteArr.length > 0) {
          chosen = quoteArr[Math.floor(Math.random() * quoteArr.length)];
        } else {
          chosen = '"Let us love, since that is what our hearts were made for." – St. Thérèse of Lisieux';
        }
        setQuote(chosen);
        localStorage.setItem('dashboardQuote', JSON.stringify({ date: today, text: chosen }));
      } catch (err) {
        console.error('[DashboardQuote] Error fetching quote:', err);
        // Fallback to localStorage cached quote if available
        if (localQuote) {
          setQuote(localQuote);
        } else {
          setQuote('"Let us love, since that is what our hearts were made for." – St. Thérèse of Lisieux');
        }
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

  // Liturgical color mapping utility
  const LITURGICAL_COLOR_MAP: Record<string, string> = {
    white: '#ffffff',
    red: '#c0392b',
    green: '#27ae60',
    purple: '#8e44ad',
    violet: '#8e44ad',
    rose: '#e17055',
    pink: '#e17055',
    black: '#222f3e',
    gold: '#f9ca24',
    blue: '#2980b9',
  };

  return (
    <Card className="bg-gradient-to-br from-clergy-primary/90 to-clergy-secondary/90 text-white border-none shadow-lg">
      <CardHeader className="pb-2 flex flex-row justify-between items-start">
        {/* Left Side: Greeting, Date/Time, Season, Cycles */}
        <div className="flex flex-col items-start min-w-[210px]">
          <CardTitle className="text-2xl font-bold">{greeting}, {userDisplayName || 'Father'}</CardTitle>
          <CardDescription className="text-white/80">{currentTime}</CardDescription>
          {liturgicalContext && (
            <>
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
                {nextSpecialDay && (
                  <>
                    <br />
                    <span className="text-center text-base text-white/60 font-normal">
                      Next special day: {nextSpecialDay.name} ({nextSpecialDay.type}) on {format(parseISO(nextSpecialDay.date), 'MMMM do')}
                    </span>
                  </>
                )}
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
              {/* Move Season above color/rank/rank number for better balance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="font-semibold">Season:</span>
                <span>{liturgicalContext.liturgical_details.season.charAt(0).toUpperCase() + liturgicalContext.liturgical_details.season.slice(1)} (Week {liturgicalContext.liturgical_details.season_week})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-semibold">Color:</span>
                <span>{capitalizeFirst(liturgicalContext.liturgical_details.celebrations[0].colour)}</span>
                {(() => {
                  const colour = liturgicalContext.liturgical_details.celebrations[0].colour?.toLowerCase();
                  const colorHex = LITURGICAL_COLOR_MAP[colour] || '#cccccc';
                  return (
                    <>
                      <span
                        title={colour}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: colorHex,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                          marginLeft: 2,
                        }}
                      />
                      <span
                        title="Liturgical color: Indicates the vestment color for today's celebration. White: feasts of the Lord, saints who were not martyrs, etc. Red: martyrs, Holy Spirit, etc. Green: Ordinary Time. Purple: Advent/Lent. Rose: Gaudete/Laetare Sundays. Black: funerals. Gold/Blue: special cases."
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 4,
                          cursor: 'pointer',
                          color: '#fff',
                          background: '#8886',
                          borderRadius: '50%',
                          width: 18,
                          height: 18,
                          fontWeight: 'bold',
                          fontSize: 13,
                          verticalAlign: 'middle',
                        }}
                        aria-label="Liturgical color info"
                      >i</span>
                    </>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-semibold">Rank:</span>
                <span>{capitalizeFirst(liturgicalContext.liturgical_details.celebrations[0].rank)}</span>
                <span
                  title="Rank: Indicates the importance of the liturgical celebration. Examples: Solemnity (highest), Feast, Memorial, Optional Memorial, Feria (weekday). Higher ranks override lower ones."
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 4,
                    cursor: 'pointer',
                    color: '#fff',
                    background: '#8886',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontWeight: 'bold',
                    fontSize: 13,
                    verticalAlign: 'middle',
                  }}
                  aria-label="Liturgical rank info"
                >i</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-semibold">Rank Number:</span>
                <span>{liturgicalContext.liturgical_details.celebrations[0].rank_num}</span>
                <span
                  title="Rank Number: A numerical value indicating the precedence of the celebration. Lower numbers are higher priority (e.g., 1.1 = Solemnity of Easter, 2.7 = Feast of an Apostle, etc.). Used to determine which celebration is observed if more than one falls on the same day."
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 4,
                    cursor: 'pointer',
                    color: '#fff',
                    background: '#8886',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontWeight: 'bold',
                    fontSize: 13,
                    verticalAlign: 'middle',
                  }}
                  aria-label="Liturgical rank number info"
                >i</span>
              </div>
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
