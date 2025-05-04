import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { db } from '@/integrations/firebase/client';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getLiturgicalContext, getCurrentDateTimeInfo, findNextSpecialDay } from '@/utils/liturgical/calapi';
import { format, parseISO } from 'date-fns';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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
              <div>
                <span className="font-semibold">Sunday Cycle:</span>{' '}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span style={{ cursor: 'pointer', fontWeight: 500 }}>
                      {liturgicalContext.cycles.sunday_cycle}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {(() => {
                      const currentCycle = liturgicalContext.cycles.sunday_cycle;
                      const now = new Date();
                      const thisYear = now.getFullYear();
                      const cycles = [
                        { label: 'A', gospel: 'Matthew' },
                        { label: 'B', gospel: 'Mark' },
                        { label: 'C', gospel: 'Luke' },
                      ];
                      const currentIdx = cycles.findIndex(c => c.label === currentCycle);
                      const safeCurrentIdx = currentIdx === -1 ? 2 : currentIdx;
                      const rolling = [];
                      for (let i = 0; i < 3; i++) {
                        const idx = (safeCurrentIdx + i) % 3;
                        const year = thisYear + i;
                        rolling.push(`• ${year}: Year ${cycles[idx].label} (${cycles[idx].gospel})`);
                      }
                      return (
                        <span style={{ maxWidth: 420, display: 'block', whiteSpace: 'normal' }}>
                          The Sunday Lectionary follows a three-year cycle:
                          <br /><br />
                          {rolling.map((line, i) => (
                            <span key={i}>{line}<br /></span>
                          ))}
                          <br />
                          The Gospel of John is read during the Easter season in all three years of the liturgical cycle.
                        </span>
                      );
                    })()}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div>
                <span className="font-semibold">Weekday Cycle:</span>{' '}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span style={{ cursor: 'pointer', fontWeight: 500 }}>
                      {liturgicalContext.cycles.weekday_cycle}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span style={{ maxWidth: 420, display: 'block', whiteSpace: 'normal' }}>
                      Weekday Cycles I and II provide a two-year rotation for the First Reading and Responsorial Psalm for weekday Masses during Ordinary Time:
                      <br /><br />
                      • Cycle I is for odd years
                      <br />
                      • Cycle II is for even years
                      <br /><br />
                      <b>What Are The Changes?</b>
                      <br /><br />
                      <span style={{ display: 'block', textIndent: '-1.5em', paddingLeft: '1.5em' }}>
                        • <b>First Reading:</b> There's a distinct set of First Readings for Cycle I and another for Cycle II for each weekday of Ordinary Time. These are primarily drawn from the Old Testament and the non-Gospel parts of the New Testament (Acts, Letters, Revelation)
                      </span>
                      <span style={{ display: 'block', textIndent: '-1.5em', paddingLeft: '1.5em' }}>
                        • <b>Responsorial Psalm:</b> The Psalm chosen typically relates thematically to the First Reading
                      </span>
                      <br />
                      This ensures a wider variety of Scripture is proclaimed during daily Mass over a two-year period, complementing the three-year cycle used for Sunday Masses.
                    </span>
                  </TooltipContent>
                </Tooltip>
              </div>
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
              {/* Liturgical Color with Tooltip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-semibold">Color:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: LITURGICAL_COLOR_MAP[liturgicalContext.liturgical_details.celebrations[0].colour?.toLowerCase()] || '#cccccc',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                          marginLeft: 2,
                          cursor: 'pointer',
                        }}
                        aria-label="Liturgical color info"
                      />
                      <span style={{ cursor: 'pointer' }}>
                        {capitalizeFirst(liturgicalContext.liturgical_details.celebrations[0].colour)}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span style={{ maxWidth: 260, display: 'block' }}>
                      {(() => {
                        const colour = liturgicalContext.liturgical_details.celebrations[0].colour?.toLowerCase();
                        const explanations = {
                          white: 'White symbolizes joy, purity, and glory. Used for Christmas, Easter, feasts of Christ, Mary, angels, and non-martyr saints.',
                          green: 'Green represents hope, life, and growth. Used during Ordinary Time, the longest season of the Church year.',
                          red: 'Red symbolizes the Holy Spirit, martyrdom, and the Passion of Christ. Used on Pentecost, feasts of martyrs, and Palm Sunday.',
                          purple: 'Purple (or violet) signifies penance, preparation, and mourning. Used during Advent, Lent, and sometimes for funerals.',
                          violet: 'Violet is a variant of purple, used for penance and preparation during Advent and Lent.',
                          rose: 'Rose pink is used only twice a year as a sign of joy in the midst of penance: Gaudete Sunday (Advent) and Laetare Sunday (Lent).',
                          pink: 'Pink is a lighter version of violet, used on Gaudete and Laetare Sundays to signify joy.',
                          black: 'Black symbolizes mourning and is rarely used today, but may appear for All Souls and Good Friday.',
                          gold: 'Gold symbolizes royalty and divine light. It may replace white, red, or green on solemn occasions.',
                          blue: 'Blue is associated with the Virgin Mary and is used in some regions for Marian feasts.',
                        };
                        return explanations[colour] || 'Liturgical color for today\'s celebration.';
                      })()}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Liturgical Rank with Tooltip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-semibold">Rank:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span style={{ cursor: 'pointer', fontWeight: 500 }}>
                      {capitalizeFirst(liturgicalContext.liturgical_details.celebrations[0].rank)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span style={{ maxWidth: 260, display: 'block' }}>
                      {(() => {
                        const rank = liturgicalContext.liturgical_details.celebrations[0].rank?.toLowerCase().replace(/\s/g, '_');
                        const explanations = {
                          solemnity: 'Solemnities are the highest rank of Catholic liturgical celebration. They commemorate the most important mysteries of faith, such as Christmas, Easter, Pentecost, and the Assumption.',
                          feast: 'Feasts are the second rank of liturgical celebration. They celebrate major events in the lives of Jesus or Mary, or honor important saints.',
                          memorial: 'Memorials are the third rank of liturgical celebration. They commemorate saints and their virtues. Memorials can be obligatory or optional.',
                          optional_memorial: 'Optional Memorials may be observed at the discretion of the priest or community. The readings and prayers may be taken from the Common of Saints.',
                          obligatory_memorial: 'Obligatory Memorials are observed unless they coincide with a higher-ranking celebration, in which case they are omitted for that year.',
                        };
                        return explanations[rank] || 'This is a liturgical rank in the Catholic calendar.';
                      })()}
                    </span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Liturgical Rank Number with Tooltip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="font-semibold">Rank Number:</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span style={{ cursor: 'pointer', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {liturgicalContext.liturgical_details.celebrations[0].rank_num}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span style={{ maxWidth: 320, whiteSpace: 'pre-line', display: 'block' }}>
                      {(() => {
                        const rankNumber = liturgicalContext.liturgical_details.celebrations[0].rank_num;
                        return (
                          `This number encodes the liturgical precedence for today.\n\n` +
                          `Lower numbers mean higher importance.\n\n` +
                          `Common codes include:\n` +
                          `1.1 = Solemnity of the Lord\n` +
                          `1.2 = Solemnity\n` +
                          `2.1 = Feast of the Lord\n` +
                          `2.2 = Feast\n` +
                          `3.1 = Obligatory Memorial\n` +
                          `3.2 = Optional Memorial\n` +
                          `4 = Feria (weekday)\n\n` +
                          `Today's rank number is ${rankNumber}, which means today's celebration is ` +
                          (rankNumber === '1.1' ? 'a Solemnity of the Lord (highest precedence).' :
                           rankNumber === '1.2' ? 'a Solemnity.' :
                           rankNumber === '2.1' ? 'a Feast of the Lord.' :
                           rankNumber === '2.2' ? 'a Feast.' :
                           rankNumber === '3.1' ? 'an Obligatory Memorial.' :
                           rankNumber === '3.2' ? 'an Optional Memorial.' :
                           rankNumber === '4' ? 'a Feria (weekday).' :
                           'of custom or local rank.'
                          )
                        );
                      })()}
                    </span>
                  </TooltipContent>
                </Tooltip>
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
