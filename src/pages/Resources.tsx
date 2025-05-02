import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Book, Globe, ExternalLink, Play, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Catholic radio stations with player URLs
const defaultRadioStations = [
  {
    id: 1,
    name: 'EWTN Radio',
    description: 'Global Catholic Radio Network',
    url: 'https://www.ewtn.com/radio/schedule',
    streamUrl: 'https://player.streamguys.com/ewtn/english/sgplayer/player.php?l=layout-small',
  },
  {
    id: 2,
    name: 'Relevant Radio',
    description: 'Talk Radio for Catholic Life',
    url: 'https://relevantradio.com/listen/schedule/',
    streamUrl: 'https://relevantradio.com/listen/stream-relevant-radio/',
  },
  {
    id: 3,
    name: 'Radio Vaticana',
    description: 'Catholic Radio of the Holy See',
    url: 'https://www.vaticannews.va/en/epg.html#schedules',
    streamUrl: 'https://www.vaticannews.va/en/epg.html#onair',
  },
  {
    id: 4,
    name: 'iCatholic Radio',
    description: 'The Station of the Cross',
    url: 'https://thestationofthecross.com/stations/icatholicradio/',
    streamUrl: 'https://thestationofthecross.com/sonaar-audio-player/',
  },
];

// Custom station slots (2 max)
const CUSTOM_STATIONS_KEY = 'custom_radio_stations';

// Mock data for resources
const resources = [
  {
    id: 1,
    title: 'DigiVatLib',
    description: 'Searchable Digital Vatican Library Documents',
    url: 'https://digi.vatlib.it/',
  },
  {
    id: 2,
    title: 'USCCB',
    description: 'United States Conference of Catholic Bishops',
    url: 'https://www.usccb.org/',
  },
  {
    id: 3,
    title: 'Catholic Answers',
    description: 'Apologetics and evangelization resources',
    url: 'https://www.catholic.com/',
  },
  {
    id: 4,
    title: 'Word on Fire',
    description: "Bishop Barron's ministry for Catholic evangelization",
    url: 'https://www.wordonfire.org/',
  },
];

const Resources = () => {
  const [radioStations, setRadioStations] = useState([...defaultRadioStations]);
  const [newStationName, setNewStationName] = useState('');
  const [newStationUrl, setNewStationUrl] = useState('');
  const [isAddingStation, setIsAddingStation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load custom stations from localStorage
    const savedStations = localStorage.getItem(CUSTOM_STATIONS_KEY);
    if (savedStations) {
      const customStations = JSON.parse(savedStations);
      setRadioStations([...defaultRadioStations, ...customStations]);
    }
  }, []);

  // Open the radio station player in a new tab
  const openRadioPlayer = (station: any) => {
    window.open(station.streamUrl, '_blank');

    // Show a toast notification
    toast({
      title: `Opening ${station.name}`,
      description: 'The radio player is opening in a new tab.',
    });
  };

  const saveCustomStation = () => {
    if (!newStationName.trim() || !newStationUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both a station name and URL',
        variant: 'destructive',
      });
      return;
    }

    // Get current custom stations
    const savedStations = localStorage.getItem(CUSTOM_STATIONS_KEY);
    const customStations = savedStations ? JSON.parse(savedStations) : [];

    // Check if we already have 2 custom stations
    if (customStations.length >= 2) {
      toast({
        title: 'Maximum Stations Reached',
        description:
          'You can only add up to 2 custom radio stations. Please remove one to add another.',
        variant: 'destructive',
      });
      return;
    }

    // Create new station
    const newStation = {
      id: Date.now(), // Use timestamp as unique ID
      name: newStationName,
      description: 'Custom Radio Station',
      url: newStationUrl,
      streamUrl: newStationUrl, // Use the provided URL for both website and stream
      isCustom: true,
    };

    // Add to list and save
    customStations.push(newStation);
    localStorage.setItem(CUSTOM_STATIONS_KEY, JSON.stringify(customStations));

    // Update state
    setRadioStations([...defaultRadioStations, ...customStations]);
    setNewStationName('');
    setNewStationUrl('');
    setIsAddingStation(false);

    toast({
      title: 'Station Added',
      description: `${newStationName} has been added to your stations.`,
    });
  };

  const removeCustomStation = (id: number) => {
    // Get current custom stations
    const savedStations = localStorage.getItem(CUSTOM_STATIONS_KEY);
    let customStations = savedStations ? JSON.parse(savedStations) : [];

    // Filter out the station to remove
    customStations = customStations.filter((station: any) => station.id !== id);

    // Save updated list
    localStorage.setItem(CUSTOM_STATIONS_KEY, JSON.stringify(customStations));

    // Update state
    setRadioStations([...defaultRadioStations, ...customStations]);

    toast({
      title: 'Station Removed',
      description: 'Custom station has been removed.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Resources</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Radio className="h-5 w-5 text-clergy-primary" />
            Catholic Radio
          </CardTitle>
          <CardDescription>Listen to Catholic radio stations</CardDescription>
        </CardHeader>
        <CardContent>
          {isAddingStation ? (
            <div className="mb-4 p-4 border rounded-lg">
              <h3 className="font-bold mb-2">Add Custom Station</h3>
              <div className="space-y-3">
                <div>
                  <Input
                    placeholder="Station Name"
                    value={newStationName}
                    onChange={(e) => setNewStationName(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Station URL (website or player URL)"
                    value={newStationUrl}
                    onChange={(e) => setNewStationUrl(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingStation(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveCustomStation}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Station
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              {radioStations.length < defaultRadioStations.length + 2 && (
                <Button
                  variant="outline"
                  className="w-full mb-4"
                  onClick={() => setIsAddingStation(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Radio Station ({radioStations.length - defaultRadioStations.length}/2)
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {radioStations.map((station: any) => (
              <Card key={station.id} className="overflow-hidden">
                <div className="h-1 bg-clergy-primary"></div>
                <CardContent className="p-4">
                  <h3 className="font-bold">{station.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{station.description}</p>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => window.open(station.url, '_blank')}
                    >
                      <Globe className="h-3 w-3" />
                      <span>Website</span>
                    </Button>

                    <div className="flex gap-1">
                      {station.isCustom && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-500"
                          onClick={() => removeCustomStation(station.id)}
                        >
                          Remove
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openRadioPlayer(station)}
                      >
                        <Play className="h-3 w-3" />
                        <span>Listen</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Book className="h-5 w-5 text-clergy-primary" />
            Ministry Resources
          </CardTitle>
          <CardDescription>Helpful resources for your ministry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <Button
                key={resource.id}
                variant="outline"
                className="flex flex-col items-start h-auto p-4 text-left"
                onClick={() => window.open(resource.url, '_blank')}
              >
                <div className="flex w-full justify-between items-center mb-1">
                  <h3 className="font-medium">{resource.title}</h3>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{resource.description}</p>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Resources;
