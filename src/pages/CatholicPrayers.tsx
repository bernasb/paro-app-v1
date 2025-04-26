
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrayerTabs } from "@/components/prayers/PrayerTabs";
import { SearchResults } from "@/components/prayers/SearchResults";
import { SearchInput } from "@/components/prayers/SearchInput";
import { useCatholicPrayers } from "@/hooks/use-catholic-prayers";

export default function CatholicPrayers() {
  const { prayers, isLoading } = useCatholicPrayers();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Catholic Prayers</h1>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {prayers.length > 0 ? (
            <>
              <SearchInput onSearch={handleSearch} searchQuery={searchQuery} />
              
              {searchQuery ? (
                <SearchResults prayers={prayers} searchQuery={searchQuery} />
              ) : (
                <PrayerTabs prayers={prayers} />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-muted-foreground">
                  No prayers available. Please try again later.
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
