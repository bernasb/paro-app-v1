import { LiturgicalReading } from "@/types/liturgical";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Book, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// Import specific formatters needed here
import {
    formatPsalmContentStructured,
    formatGospelAcclamationStructured,
    removeCharacterCounts,
    formatReadingContent,
    formatSummary,
    formatDetailedExplanation
} from '@/utils/formattingUtils';
// Note: formatProseWithQuotes likely not needed anymore

interface ReadingCardProps {
  reading: LiturgicalReading;
}

// Helper function to render content *inside* the card
const renderFormattedContent = (reading: LiturgicalReading) => {
    const titleLower = reading.title.toLowerCase();
    // Use the content directly from props, cleaning happens in service now
    const content = reading.content || "";

    if (titleLower.includes('responsorial psalm')) {
      // ReadingCard uses formatPsalmContentStructured for specific Psalm formatting
      const formattedPsalm = formatPsalmContentStructured(content); // Pass raw content from service
      return formattedPsalm.map((line, idx) => {
        switch (line.type) {
          case 'response': return <strong key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></strong>;
          case 'verse_part1': return <div key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></div>;
          case 'verse_part2': return <div key={idx} style={{ paddingLeft: '2em' }} dangerouslySetInnerHTML={{ __html: line.text }}></div>;
          case 'blank': return <div key={idx} style={{ marginBottom: '0.75em' }}></div>;
          default: return null;
        }
      });
    } else if (titleLower.includes('gospel acclamation')) {
      // ReadingCard uses formatGospelAcclamationStructured for specific formatting
       const formattedAcclamation = formatGospelAcclamationStructured(content); // Pass raw content from service
       return formattedAcclamation.map((line, idx) => {
        switch (line.type) {
          case 'main_sentence': return <strong key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></strong>;
          case 'verse_part1': return <div key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></div>;
          case 'verse_part2': return <div key={idx} style={{ paddingLeft: '2em' }} dangerouslySetInnerHTML={{ __html: line.text }}></div>;
          case 'blank': return <div key={idx} style={{ marginBottom: '0.75em' }}></div>;
          default: return null;
        }
      });
    }
     else if (titleLower.includes('gospel') && content.includes('<div style=')) {
        // Passion Gospel: Render the raw HTML provided by the service
        // Wrap with a class for CSS targeting
        return <div className="prose-passion" dangerouslySetInnerHTML={{ __html: content }} />;

    } else {
      // Default/Prose (First/Second Reading, Standard Gospel, Citations, etc.)
      // Render the HTML formatted by the service (which now includes breaks and wrapping)
      const cleanContent = content.replace(/style=".*?"/g, "");
      return <div
               className="whitespace-pre-wrap"
               dangerouslySetInnerHTML={{ __html: cleanContent }}
             />;
    }
  };


export const ReadingCard = ({ reading }: ReadingCardProps) => {
  // Determine if the summary should be shown
  const showSummary = !reading.title.toLowerCase().includes('gospel acclamation') && !reading.title.toLowerCase().includes('responsorial psalm');

  // Ensure reading content is not null/undefined
   const safeReading = {
    ...reading,
    content: reading.content || "",
    summary: reading.summary || "",
    detailedExplanation: reading.detailedExplanation || "",
  };

  // Format citation to replace HTML entity with en-dash
  const formattedCitation = (safeReading.citation || "").replace(/&#x2010;/g, '–');

  return (
    <Card className="reading-card ml-6">
      {/* Add pl-6 for alignment */}
      <CardHeader className="pb-2 pl-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Book className="h-5 w-5 text-clergy-primary" />
          {safeReading.title}
        </CardTitle>
        <CardDescription>{formattedCitation}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Section */}
        {showSummary && (
          <>
            {safeReading.summaryLoading && (
              <div className="mb-4 space-y-2 pl-6"> {/* Add pl-6 here too */}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
            {safeReading.summaryError && !safeReading.summaryLoading && (
              <p className="italic text-destructive mb-4 text-xs">
                Error loading summary: {safeReading.summaryError}
              </p>
            )}
            {/* Apply enhanced formatting to summary */}
            {safeReading.summary && !safeReading.summaryLoading && !safeReading.summaryError && (
              <div className="mb-4">
                <div
                  className="text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: formatSummary(removeCharacterCounts(safeReading.summary)) }}
                />
                
                {safeReading.detailedExplanation && (
                  <Collapsible className="mt-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1 mt-2">
                        <Info className="h-4 w-4" />
                        More Information
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-4 bg-muted/50 rounded-md">
                      <div 
                        className="prose prose-sm max-w-none prose-headings:font-bold prose-p:mb-2 prose-ul:pl-5 prose-li:mb-1"
                        dangerouslySetInnerHTML={{ __html: formatDetailedExplanation(removeCharacterCounts(safeReading.detailedExplanation)) }} 
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </>
        )}
        {/* End of Summary Section */}

        {/* Content Rendering */}
        {/* Keep existing pl-6 */}
        <div className="text-base">
           {renderFormattedContent(safeReading)}
        </div>
      </CardContent>
    </Card>
  );
};
