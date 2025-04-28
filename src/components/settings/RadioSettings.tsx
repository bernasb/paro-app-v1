import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Radio, Save, Plus, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CUSTOM_STATIONS_KEY = 'custom_radio_stations';

const RadioSettings = () => {
  const [customStations, setCustomStations] = useState<any[]>([]);
  const [newStationName, setNewStationName] = useState('');
  const [newStationUrl, setNewStationUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Load custom stations from localStorage
    const savedStations = localStorage.getItem(CUSTOM_STATIONS_KEY);
    if (savedStations) {
      setCustomStations(JSON.parse(savedStations));
    }
  }, []);

  const handleSaveStation = () => {
    if (!newStationName.trim() || !newStationUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both a station name and URL',
        variant: 'destructive',
      });
      return;
    }

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
      id: Date.now(),
      name: newStationName,
      description: 'Custom Radio Station',
      url: newStationUrl,
      streamUrl: '#',
      isCustom: true,
    };

    // Add to list and save
    const updatedStations = [...customStations, newStation];
    setCustomStations(updatedStations);
    localStorage.setItem(CUSTOM_STATIONS_KEY, JSON.stringify(updatedStations));

    // Clear fields
    setNewStationName('');
    setNewStationUrl('');

    toast({
      title: 'Station Added',
      description: `${newStationName} has been added to your stations.`,
    });
  };

  const handleDeleteStation = (id: number) => {
    const filteredStations = customStations.filter((station) => station.id !== id);
    setCustomStations(filteredStations);
    localStorage.setItem(CUSTOM_STATIONS_KEY, JSON.stringify(filteredStations));

    toast({
      title: 'Station Removed',
      description: 'Custom station has been removed.',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Radio className="h-5 w-5 text-clergy-primary" />
          Catholic Radio Settings
        </CardTitle>
        <CardDescription>Manage your favorite radio stations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Radio Station Presets</Label>
            <p className="text-sm text-muted-foreground">
              Add your favorite Catholic radio stations for quick access (max 2)
            </p>
          </div>

          {customStations.map((station) => (
            <div key={station.id} className="flex items-center gap-2 p-2 border rounded-md">
              <div className="flex-1">
                <div className="font-medium">{station.name}</div>
                <div className="text-sm text-muted-foreground truncate">{station.url}</div>
              </div>
              <Button variant="outline" size="icon" onClick={() => handleDeleteStation(station.id)}>
                <Trash className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}

          {customStations.length < 2 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Station Name"
                  className="flex-1"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                />
                <Input
                  placeholder="Station URL"
                  className="flex-1"
                  value={newStationUrl}
                  onChange={(e) => setNewStationUrl(e.target.value)}
                />
                <Button variant="outline" size="icon" onClick={handleSaveStation}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            {customStations.length}/2 custom stations added
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RadioSettings;
