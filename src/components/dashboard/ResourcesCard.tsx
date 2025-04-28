import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Default radio stations
const defaultRadioStations = [
  {
    id: 1,
    name: 'EWTN Radio',
    url: 'https://ewtn.com/radio/',
  },
  {
    id: 2,
    name: 'Relevant Radio',
    url: 'https://relevantradio.com/',
  },
  {
    id: 3,
    name: 'Ave Maria Radio',
    url: 'https://avemariaradio.net/',
  },
];

const CUSTOM_STATIONS_KEY = 'custom_radio_stations';

export function ResourcesCard() {
  const [radioStations, setRadioStations] = useState([...defaultRadioStations]);

  useEffect(() => {
    // Load custom stations from localStorage
    const savedStations = localStorage.getItem(CUSTOM_STATIONS_KEY);
    if (savedStations) {
      const customStations = JSON.parse(savedStations);
      // Only show default stations + up to 2 custom stations in dashboard card
      const combinedStations = [...defaultRadioStations];
      // Add custom stations (limit to first 2 if there are more)
      if (customStations.length > 0) {
        combinedStations.push({
          id: customStations[0].id,
          name: customStations[0].name,
          url: customStations[0].url,
        });
      }
      setRadioStations(combinedStations);
    }
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Radio className="h-5 w-5 text-clergy-primary" />
          Catholic Radio
        </CardTitle>
        <CardDescription>Quick access to Catholic radio stations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {radioStations.map((station) => (
            <Button
              key={station.id}
              variant="outline"
              className="justify-between h-auto py-3"
              onClick={() => window.open(station.url, '_blank')}
            >
              <span>{station.name}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
