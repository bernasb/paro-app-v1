import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LinkEntry {
  id: number;
  name: string;
  url: string;
}

const DIOCESE_PARISH_LINKS_KEY = 'diocese_parish_links';

const QuickLinks = () => {
  const [links, setLinks] = useState<LinkEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(DIOCESE_PARISH_LINKS_KEY);
    if (saved) setLinks(JSON.parse(saved));
  }, []);

  if (!links.length) return null;

  // Find the longest link name
  const longestNameLength = links.reduce((max, link) =>
    link.name.length > max ? link.name.length : max, 0
  );
  // Set a minimum width based on the longest name (add padding for aesthetics)
  const charWidth = 11; // px per character, adjust for font
  const minWidth = Math.max(200, longestNameLength * charWidth + 40); // 40px padding

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-clergy-primary" />
          Quick Links
        </CardTitle>
        <br />
        <br />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-center gap-4">
          {links.map(link => (
            <Button
              key={link.id}
              asChild
              className="bg-clergy-primary hover:bg-clergy-primary/90 text-white px-6 py-3 rounded shadow-md max-w-full w-full sm:w-auto font-normal"
              style={{ minWidth, maxWidth: minWidth }}
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'normal' }}>{link.name}</a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickLinks;
