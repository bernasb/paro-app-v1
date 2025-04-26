
import { CatholicPrayer } from "@/utils/magisterium";
import { PrayerAccordion } from "./PrayerAccordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SearchResultsProps {
  prayers: CatholicPrayer[];
  searchQuery: string;
}

export const SearchResults = ({ prayers, searchQuery }: SearchResultsProps) => {
  if (!searchQuery.trim()) {
    return null;
  }

  const filteredPrayers = prayers.filter(prayer => 
    prayer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prayer.description && prayer.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    prayer.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Search Results</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredPrayers.length > 0 ? (
          <PrayerAccordion prayers={filteredPrayers} />
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No prayers found matching "{searchQuery}"
          </div>
        )}
      </CardContent>
    </Card>
  );
};
