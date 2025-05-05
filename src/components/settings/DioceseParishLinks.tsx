import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Trash, Plus } from 'lucide-react';

const DIOCESE_PARISH_LINKS_KEY = 'diocese_parish_links';

interface LinkEntry {
  id: number;
  name: string;
  url: string;
}

const MAX_LINKS = 4;

const DioceseParishLinks = () => {
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingId, setEditingId] = useState<number|null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(DIOCESE_PARISH_LINKS_KEY);
    if (saved) setLinks(JSON.parse(saved));
  }, []);

  const saveLinks = (updated: LinkEntry[]) => {
    setLinks(updated);
    localStorage.setItem(DIOCESE_PARISH_LINKS_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    if (links.length >= MAX_LINKS) return;
    const newEntry = { id: Date.now(), name: newName, url: newUrl };
    const updated = [...links, newEntry];
    saveLinks(updated);
    setNewName('');
    setNewUrl('');
  };

  const handleDelete = (id: number) => {
    const updated = links.filter(link => link.id !== id);
    saveLinks(updated);
  };

  const startEdit = (link: LinkEntry) => {
    setEditingId(link.id);
    setEditName(link.name);
    setEditUrl(link.url);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const saveEdit = () => {
    if (!editName.trim() || !editUrl.trim()) return;
    const updated = links.map(link =>
      link.id === editingId ? { ...link, name: editName, url: editUrl } : link
    );
    saveLinks(updated);
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const handleSaveAll = () => {
    saveLinks(links);
  };

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      {links.map(link => (
        editingId === link.id ? (
          <div key={link.id} className="flex items-center gap-2 p-2 border rounded-md bg-gray-900">
            <input
              className="w-[320px] px-2 py-1 rounded border border-gray-600 bg-gray-800 text-white truncate"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Name"
            />
            <input
              className="w-[420px] px-2 py-1 rounded border border-gray-600 bg-gray-800 text-white truncate"
              value={editUrl}
              onChange={e => setEditUrl(e.target.value)}
              placeholder="URL"
            />
            <Button variant="outline" className="min-w-[80px]" onClick={saveEdit}>
              <Save className="h-4 w-4 text-green-500" />
            </Button>
            <Button variant="outline" className="min-w-[80px]" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        ) : (
          <div key={link.id} className="flex items-center gap-2 p-2 border rounded-md min-w-[820px] max-w-[820px] w-[820px]">
            <div className="flex-1">
              <div className="font-medium truncate">{link.name}</div>
              <div className="text-sm text-muted-foreground truncate w-full block">{link.url}</div>
            </div>
            <Button variant="outline" className="min-w-[80px]" onClick={() => startEdit(link)}>
              Edit
            </Button>
            <Button variant="outline" className="min-w-[80px]" onClick={() => handleDelete(link.id)}>
              <Trash className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )
      ))}
      {links.length < MAX_LINKS && (
        <div className="flex gap-2">
          <Input
            placeholder="Name (e.g. Parish Calendar)"
            className="w-[320px] truncate"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <Input
            placeholder="URL"
            className="w-[420px] truncate"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
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
        <div className="text-xs text-muted-foreground">{links.length}/{MAX_LINKS} links added</div>
      </div>
    </div>
  );
};

export default DioceseParishLinks;
