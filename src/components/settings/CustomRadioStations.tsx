import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Save, Plus, Trash } from 'lucide-react';

const CUSTOM_STATIONS_KEY = 'custom_radio_stations';
const MAX_STATIONS = 2;

interface StationEntry {
  id: number;
  name: string;
  url: string;
}

const CustomRadioStations = () => {
  const [stations, setStations] = useState<StationEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(CUSTOM_STATIONS_KEY);
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        // Convert from old format if needed
        const formattedStations = parsedData.map(station => ({
          id: station.id || Date.now(),
          name: station.name,
          url: station.url || station.streamUrl || ''
        }));
        setStations(formattedStations);
      } catch (e) {
        console.error('Error parsing radio stations', e);
      }
    }
  }, []);

  const saveStations = (updated: StationEntry[]) => {
    setStations(updated);
    localStorage.setItem(CUSTOM_STATIONS_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    if (stations.length >= MAX_STATIONS) return;
    const newEntry = { id: Date.now(), name: newName, url: newUrl };
    const updated = [...stations, newEntry];
    saveStations(updated);
    setNewName('');
    setNewUrl('');
  };

  const handleDelete = (id: number) => {
    const updated = stations.filter(station => station.id !== id);
    saveStations(updated);
  };

  const startEdit = (station: StationEntry) => {
    setEditingId(station.id);
    setEditName(station.name);
    setEditUrl(station.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const saveEdit = () => {
    if (!editName.trim() || !editUrl.trim()) return;
    const updated = stations.map(station =>
      station.id === editingId ? { ...station, name: editName, url: editUrl } : station
    );
    saveStations(updated);
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const handleSaveAll = () => {
    saveStations(stations);
  };

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      {stations.map(station => (
        editingId === station.id ? (
          <div key={station.id} className="flex items-center gap-2 p-2 border rounded-md bg-gray-900 min-w-[820px] max-w-[820px] w-[820px]">
            <input
              className="w-[320px] px-2 py-1 rounded border border-gray-600 bg-gray-800 text-white truncate"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Station Name"
            />
            <input
              className="w-[420px] px-2 py-1 rounded border border-gray-600 bg-gray-800 text-white truncate"
              value={editUrl}
              onChange={e => setEditUrl(e.target.value)}
              placeholder="Station URL"
            />
            <Button variant="outline" className="min-w-[80px]" onClick={saveEdit}>
              <Save className="h-4 w-4 text-green-500" />
            </Button>
            <Button variant="outline" className="min-w-[80px]" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <div key={station.id} className="flex items-center gap-2 p-2 border rounded-md bg-gray-900 min-w-[820px] max-w-[820px] w-[820px]">
            <div className="flex-1">
              <div className="font-medium truncate">{station.name}</div>
              <div className="text-sm text-muted-foreground truncate w-full block">{station.url}</div>
            </div>
            <Button variant="outline" className="min-w-[80px]" onClick={() => startEdit(station)}>
              Edit
            </Button>
            <Button variant="outline" className="min-w-[80px]" onClick={() => handleDelete(station.id)}>
              <Trash className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )
      ))}
      {stations.length < MAX_STATIONS && (
        <div className="flex gap-2">
          <Input
            placeholder="Station Name"
            className="w-[320px] truncate"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Station URL"
            className="w-[420px] truncate"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <Button variant="outline" size="icon" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-4 mt-2">
        <Button variant="outline" size="sm" onClick={handleSaveAll}>
          <Save className="h-4 w-4 mr-1" /> Save All
        </Button>
        <div className="text-xs text-muted-foreground">{stations.length}/{MAX_STATIONS} custom stations added</div>
      </div>
    </div>
  );
};

export default CustomRadioStations;
