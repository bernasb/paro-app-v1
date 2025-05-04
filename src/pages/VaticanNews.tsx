import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Cross, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { format } from 'date-fns';

// Type for RSS feed items
interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  image: string;
}

// Type for RSS feed configuration
interface RSSFeedConfig {
  id: string;
  url: string;
  name: string;
}

const VaticanNews = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedItems, setFeedItems] = useState<RSSItem[]>([]);
  const [feedConfigs, setFeedConfigs] = useState<RSSFeedConfig[]>([]);

  // Function to fetch RSS feed configurations from Firestore
  const fetchRSSConfigs = async () => {
    try {
      const configsCollection = collection(db, 'rssFeeds');
      const configsSnapshot = await getDocs(configsCollection);

      if (configsSnapshot.empty) {
        setError('No RSS feeds configured. Please add feeds in the Admin page.');
        setLoading(false);
        return [];
      }

      const configs: RSSFeedConfig[] = [];
      configsSnapshot.forEach((doc) => {
        const data = doc.data();
        configs.push({
          id: doc.id,
          url: data.url,
          name: data.name,
        });
      });

      setFeedConfigs(configs);
      return configs;
    } catch (err) {
      console.error('Error fetching RSS configurations:', err);
      setError('Failed to load RSS feed configurations.');
      setLoading(false);
      return [];
    }
  };

  // Function to fetch and parse RSS feeds
  const fetchRSSFeeds = async (configs: RSSFeedConfig[]) => {
    setLoading(true);
    setError(null);

    try {
      // If no configs, show error
      if (configs.length === 0) {
        setError('No RSS feeds configured. Please add feeds in the Admin page.');
        setLoading(false);
        return;
      }

      // Create a proxy URL for CORS issues
      const createProxyUrl = (url: string) => {
        return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      };

      // Fetch all feeds in parallel
      const feedPromises = configs.map(async (config) => {
        try {
          const response = await fetch(createProxyUrl(config.url));
          const data = await response.json();

          if (!data.contents) {
            throw new Error(`Failed to fetch feed from ${config.name}`);
          }

          // Handle AllOrigins base64 data URI (if present, any charset)
          const base64Match = data.contents.match(/^data:application\/rss\+xml;\s*charset=[^;]+;base64,/i);
          if (base64Match) {
            const base64Prefix = base64Match[0];
            const base64 = data.contents.slice(base64Prefix.length);
            // Decode base64 to UTF-8 string
            const binaryString = atob(base64);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            data.contents = new TextDecoder('utf-8').decode(bytes);
          }

          // Debug: log first 500 chars of XML string for each feed
          console.log(`Raw XML for ${config.name}:`, data.contents.slice(0, 500));

          // Parse the XML
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(data.contents, 'text/xml');

          // Extract items
          const items = xmlDoc.querySelectorAll('item');
          let parsedItems: RSSItem[] = [];

          items.forEach((item) => {
            const title = item.querySelector('title')?.textContent || 'No Title';
            const link = item.querySelector('link')?.textContent || '#';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            // Prefer <content:encoded> over <description>
            let description = '';
            const contentEncoded = item.getElementsByTagName('content:encoded')[0];
            if (contentEncoded && contentEncoded.textContent) {
              description = contentEncoded.textContent;
            } else {
              description = item.querySelector('description')?.textContent || '';
            }
            // Optionally extract image from <media:content>
            let image = '';
            const mediaContent = item.getElementsByTagName('media:content')[0];
            if (mediaContent && mediaContent.getAttribute('url')) {
              image = mediaContent.getAttribute('url');
            } else {
              // Try to extract first <img> from <description>
              const descHtml = item.querySelector('description')?.textContent || '';
              const tmpDiv = document.createElement('div');
              tmpDiv.innerHTML = descHtml;
              const imgTag = tmpDiv.querySelector('img');
              if (imgTag && imgTag.src) {
                image = imgTag.src;
              }
            }
            parsedItems.push({
              title,
              link,
              pubDate,
              description,
              source: config.name,
              image,
            });
          });

          // Limit to 10 most recent articles per feed
          parsedItems = parsedItems
            .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
            .slice(0, 10);

          // Debug log for feed parsing
          console.log(`Parsed items for ${config.name}:`, parsedItems);

          return parsedItems;
        } catch (err) {
          console.error(`Error fetching feed ${config.name}:`, err);
          // Return empty array for this feed but don't fail the whole process
          return [];
        }
      });

      // Wait for all feeds to be fetched
      const results = await Promise.all(feedPromises);

      // Combine all feed items and sort by date (newest first)
      const allItems = results.flat().sort((a, b) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });

      setFeedItems(allItems);
      setLoading(false);

      if (allItems.length === 0) {
        setError('No news items found in the configured feeds.');
      }
    } catch (err) {
      console.error('Error fetching RSS feeds:', err);
      setError('Failed to load news feeds. Please try again later.');
      setLoading(false);
    }
  };

  // Function to refresh feeds
  const refreshFeeds = async () => {
    const configs = await fetchRSSConfigs();
    await fetchRSSFeeds(configs);
    toast({
      title: 'Feeds Refreshed',
      description: 'The latest news has been loaded.',
    });
  };

  // Initial load
  useEffect(() => {
    const loadFeeds = async () => {
      const configs = await fetchRSSConfigs();
      await fetchRSSFeeds(configs);
    };

    loadFeeds();
  }, []);

  // Function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMMM d, yyyy 'at' h:mm a");
    } catch (err) {
      return dateString;
    }
  };

  // Function to strip HTML tags
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Utility to get the first N sentences from a string
  function getFirstNSentences(text: string, n: number): string {
    // Remove excessive whitespace
    const clean = text.replace(/\s+/g, ' ').trim();
    // Split on sentence endings
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    const preview = sentences.slice(0, n).join(' ').trim();
    return sentences.length > n ? preview + '...' : preview;
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Cross className="mr-2 h-6 w-6 text-clergy-primary" />
          Latest Catholic News
        </h1>
        <Button variant="outline" onClick={refreshFeeds} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle>Error Loading News</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={refreshFeeds} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* News Items */}
      {!loading && !error && feedItems.length > 0 && (
        <div className="space-y-4">
          {feedItems.map((item, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription className="flex justify-between">
                  <span>Source: {item.source}</span>
                  <span>{formatDate(item.pubDate)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-3xl">
                  <p className="mb-4 text-pretty leading-relaxed">{getFirstNSentences(stripHtml(item.description), 2)}</p>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-64 object-cover mb-4"
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      Read Full Article
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Items State */}
      {!loading && !error && feedItems.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No News Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No news items are currently available. Please check your RSS feed configuration or try
              again later.
            </p>
            <Button onClick={refreshFeeds} className="mt-4">
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VaticanNews;
