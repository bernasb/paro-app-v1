import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, RefreshCw, Calendar as CalendarIcon, Trash2, BarChart3, Cross, Save, Plus, Edit, X } from 'lucide-react';
import { clearCache, getCacheStats, preFetchReadingsForDate } from '@/services/liturgical/readingSummariesCache';
import { getDailyMassReadings, getReadingSummary } from '@/services/liturgical/liturgicalService';
import { collection, doc, getDocs, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

// Interface for RSS feed
interface RSSFeed {
  id: string;
  name: string;
  url: string;
}

// Admin page component
const Admin = () => {
  // State for RSS feeds
  const [rssFeeds, setRssFeeds] = useState<RSSFeed[]>([]);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [savingFeed, setSavingFeed] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  
  // State for cache operations
  const [clearingCache, setClearingCache] = useState(false);
  const [clearCacheResult, setClearCacheResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // State for cache statistics
  const [cacheStats, setCacheStats] = useState<{
    totalDocuments: number;
    oldestDocument?: { id: string; lastUpdated: Date };
    newestDocument?: { id: string; lastUpdated: Date };
    mostAccessed?: { id: string; fetchCount: number };
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // State for pre-fetching
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 1)) // Default to tomorrow
  );
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchResult, setPrefetchResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Load cache statistics and RSS feeds on component mount
  useEffect(() => {
    loadCacheStats();
    loadRSSFeeds();
  }, []);
  
  // Function to load RSS feeds from Firestore
  const loadRSSFeeds = async () => {
    setLoadingFeeds(true);
    setFeedError(null);
    
    try {
      const feedsCollection = collection(db, 'rssFeeds');
      const feedsSnapshot = await getDocs(feedsCollection);
      
      const feeds: RSSFeed[] = [];
      feedsSnapshot.forEach((doc) => {
        const data = doc.data();
        feeds.push({
          id: doc.id,
          name: data.name,
          url: data.url
        });
      });
      
      setRssFeeds(feeds);
    } catch (error) {
      console.error('Error loading RSS feeds:', error);
      setFeedError('Failed to load RSS feeds. Please try again.');
    } finally {
      setLoadingFeeds(false);
    }
  };
  
  // Function to save a new RSS feed
  const handleSaveFeed = async () => {
    if (!newFeedName.trim() || !newFeedUrl.trim()) {
      setFeedError('Please provide both a name and URL for the feed.');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(newFeedUrl);
    } catch (e) {
      setFeedError('Please enter a valid URL including http:// or https://');
      return;
    }
    
    // Check if we already have 3 feeds
    if (rssFeeds.length >= 3 && !editingFeed) {
      setFeedError('Maximum of 3 RSS feeds allowed. Please remove one to add another.');
      return;
    }
    
    setSavingFeed(true);
    setFeedError(null);
    
    try {
      if (editingFeed) {
        // Update existing feed
        await setDoc(doc(db, 'rssFeeds', editingFeed.id), {
          name: newFeedName,
          url: newFeedUrl
        });
        
        // Update local state
        setRssFeeds(prev => prev.map(feed => 
          feed.id === editingFeed.id 
            ? { ...feed, name: newFeedName, url: newFeedUrl } 
            : feed
        ));
        
        setEditingFeed(null);
      } else {
        // Add new feed
        const docRef = await addDoc(collection(db, 'rssFeeds'), {
          name: newFeedName,
          url: newFeedUrl
        });
        
        // Update local state
        setRssFeeds(prev => [...prev, {
          id: docRef.id,
          name: newFeedName,
          url: newFeedUrl
        }]);
      }
      
      // Reset form
      setNewFeedName('');
      setNewFeedUrl('');
      
    } catch (error) {
      console.error('Error saving RSS feed:', error);
      setFeedError('Failed to save RSS feed. Please try again.');
    } finally {
      setSavingFeed(false);
    }
  };
  
  // Function to delete an RSS feed
  const handleDeleteFeed = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rssFeeds', id));
      
      // Update local state
      setRssFeeds(prev => prev.filter(feed => feed.id !== id));
      
      // If we were editing this feed, reset the form
      if (editingFeed && editingFeed.id === id) {
        setEditingFeed(null);
        setNewFeedName('');
        setNewFeedUrl('');
      }
    } catch (error) {
      console.error('Error deleting RSS feed:', error);
      setFeedError('Failed to delete RSS feed. Please try again.');
    }
  };
  
  // Function to start editing a feed
  const handleEditFeed = (feed: RSSFeed) => {
    setEditingFeed(feed);
    setNewFeedName(feed.name);
    setNewFeedUrl(feed.url);
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingFeed(null);
    setNewFeedName('');
    setNewFeedUrl('');
  };
  
  // Function to load cache statistics
  const loadCacheStats = async () => {
    setLoadingStats(true);
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Error loading cache statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  // Function to clear the cache
  const handleClearCache = async () => {
    setClearingCache(true);
    setClearCacheResult(null);
    
    try {
      const deletedCount = await clearCache();
      setClearCacheResult({
        success: true,
        message: `Successfully cleared ${deletedCount} documents from the cache.`
      });
      
      // Refresh cache statistics
      await loadCacheStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
      setClearCacheResult({
        success: false,
        message: `Error clearing cache: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setClearingCache(false);
    }
  };
  
  // Function to pre-fetch readings for a date
  const handlePreFetch = async () => {
    if (!selectedDate) {
      setPrefetchResult({
        success: false,
        message: 'Please select a date to pre-fetch readings for.'
      });
      return;
    }
    
    setPrefetching(true);
    setPrefetchResult(null);
    
    try {
      const successCount = await preFetchReadingsForDate(
        selectedDate,
        getDailyMassReadings,
        getReadingSummary
      );
      
      setPrefetchResult({
        success: true,
        message: `Successfully pre-fetched ${successCount} readings for ${selectedDate.toLocaleDateString()}.`
      });
      
      // Refresh cache statistics
      await loadCacheStats();
    } catch (error) {
      console.error('Error pre-fetching readings:', error);
      setPrefetchResult({
        success: false,
        message: `Error pre-fetching readings: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setPrefetching(false);
    }
  };
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="cache">
        <TabsList className="mb-4">
          <TabsTrigger value="cache">Cache Management</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="prefetch">Pre-fetch Readings</TabsTrigger>
          <TabsTrigger value="rss">RSS Feeds</TabsTrigger>
        </TabsList>
        
        {/* Cache Management Tab */}
        <TabsContent value="cache">
          <Card>
            <CardHeader>
              <CardTitle>Cache Management</CardTitle>
              <CardDescription>
                Clear the reading summaries cache to force fresh data to be fetched.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleClearCache} 
                    disabled={clearingCache}
                  >
                    {clearingCache ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Cache
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={loadCacheStats} 
                    disabled={loadingStats}
                  >
                    {loadingStats ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Stats
                      </>
                    )}
                  </Button>
                </div>
                
                {clearCacheResult && (
                  <Alert variant={clearCacheResult.success ? "default" : "destructive"}>
                    {clearCacheResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {clearCacheResult.success ? "Success" : "Error"}
                    </AlertTitle>
                    <AlertDescription>
                      {clearCacheResult.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Cache Statistics</h3>
                  {loadingStats ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading statistics...</span>
                    </div>
                  ) : cacheStats ? (
                    <div className="space-y-2">
                      <p><strong>Total Documents:</strong> {cacheStats.totalDocuments}</p>
                      
                      {cacheStats.oldestDocument && (
                        <p>
                          <strong>Oldest Document:</strong> {cacheStats.oldestDocument.id.substring(0, 30)}...
                          <br />
                          <span className="text-sm text-muted-foreground ml-6">
                            Last Updated: {cacheStats.oldestDocument.lastUpdated.toLocaleString()}
                          </span>
                        </p>
                      )}
                      
                      {cacheStats.newestDocument && (
                        <p>
                          <strong>Newest Document:</strong> {cacheStats.newestDocument.id.substring(0, 30)}...
                          <br />
                          <span className="text-sm text-muted-foreground ml-6">
                            Last Updated: {cacheStats.newestDocument.lastUpdated.toLocaleString()}
                          </span>
                        </p>
                      )}
                      
                      {cacheStats.mostAccessed && (
                        <p>
                          <strong>Most Accessed Document:</strong> {cacheStats.mostAccessed.id.substring(0, 30)}...
                          <br />
                          <span className="text-sm text-muted-foreground ml-6">
                            Fetch Count: {cacheStats.mostAccessed.fetchCount}
                          </span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>No statistics available. Click "Refresh Stats" to load.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Statistics Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Cache Analytics</CardTitle>
              <CardDescription>
                View detailed statistics about the reading summaries cache.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Cache Overview</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadCacheStats} 
                    disabled={loadingStats}
                  >
                    {loadingStats ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
                
                {loadingStats ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading statistics...</span>
                  </div>
                ) : cacheStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{cacheStats.totalDocuments}</div>
                          <p className="text-xs text-muted-foreground">
                            Cached reading summaries
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Cache Age</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {cacheStats.oldestDocument ? (
                            <>
                              <div className="text-2xl font-bold">
                                {Math.floor((Date.now() - cacheStats.oldestDocument.lastUpdated.getTime()) / (1000 * 60 * 60 * 24))} days
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Since oldest document
                              </p>
                            </>
                          ) : (
                            <div className="text-muted-foreground">No data</div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {cacheStats.mostAccessed ? (
                            <>
                              <div className="text-2xl font-bold">
                                {cacheStats.mostAccessed.fetchCount} views
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {cacheStats.mostAccessed.id.substring(0, 20)}...
                              </p>
                            </>
                          ) : (
                            <div className="text-muted-foreground">No data</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Recent Documents</h3>
                      {cacheStats.newestDocument ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">Newest Document:</span>
                            <span>{cacheStats.newestDocument.lastUpdated.toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground break-all">
                            ID: {cacheStats.newestDocument.id}
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No recent documents found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mb-2" />
                    <p>No statistics available.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadCacheStats} 
                      className="mt-2"
                    >
                      Load Statistics
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* RSS Feeds Tab */}
        <TabsContent value="rss">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cross className="h-5 w-5 text-clergy-primary" />
                RSS Feed Management
              </CardTitle>
              <CardDescription>
                Configure up to three RSS feeds for the Vatican News page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Form for adding/editing feeds */}
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {editingFeed ? 'Edit RSS Feed' : 'Add RSS Feed'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="feed-name">Feed Name</Label>
                        <Input
                          id="feed-name"
                          placeholder="e.g., Vatican News"
                          value={newFeedName}
                          onChange={(e) => setNewFeedName(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="feed-url">Feed URL</Label>
                        <Input
                          id="feed-url"
                          placeholder="https://example.com/rss"
                          value={newFeedUrl}
                          onChange={(e) => setNewFeedUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the full URL of the RSS feed including http:// or https://
                        </p>
                      </div>
                      
                      {feedError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{feedError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex justify-end gap-2">
                        {editingFeed && (
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        )}
                        
                        <Button
                          onClick={handleSaveFeed}
                          disabled={savingFeed || !newFeedName || !newFeedUrl}
                        >
                          {savingFeed ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : editingFeed ? (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Update Feed
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Feed
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* List of current feeds */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Current RSS Feeds ({rssFeeds.length}/3)</h3>
                  
                  {loadingFeeds ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading feeds...</span>
                    </div>
                  ) : rssFeeds.length === 0 ? (
                    <p className="text-muted-foreground">No RSS feeds configured yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {rssFeeds.map((feed) => (
                        <Card key={feed.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{feed.name}</h4>
                              <p className="text-sm text-muted-foreground break-all">{feed.url}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditFeed(feed)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDeleteFeed(feed.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pre-fetch Tab */}
        <TabsContent value="prefetch">
          <Card>
            <CardHeader>
              <CardTitle>Pre-fetch Readings</CardTitle>
              <CardDescription>
                Pre-fetch readings for specific dates to ensure they're available in the cache.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Select Date</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-medium mb-2">Pre-fetch Options</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Selected Date: {selectedDate ? selectedDate.toLocaleDateString() : 'None'}
                        </p>
                        
                        <Button 
                          onClick={handlePreFetch} 
                          disabled={prefetching || !selectedDate}
                        >
                          {prefetching ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Pre-fetching...
                            </>
                          ) : (
                            <>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              Pre-fetch Readings
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {prefetchResult && (
                        <Alert variant={prefetchResult.success ? "default" : "destructive"}>
                          {prefetchResult.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {prefetchResult.success ? "Success" : "Error"}
                          </AlertTitle>
                          <AlertDescription>
                            {prefetchResult.message}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Quick Actions</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedDate(new Date(new Date().setDate(new Date().getDate() + 1)))}
                          >
                            Tomorrow
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedDate(new Date(new Date().setDate(new Date().getDate() + 7)))}
                          >
                            Next Week
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const nextSunday = new Date();
                              nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
                              setSelectedDate(nextSunday);
                            }}
                          >
                            Next Sunday
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
