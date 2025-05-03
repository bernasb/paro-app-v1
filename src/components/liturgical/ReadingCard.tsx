import { LiturgicalReading } from '@/types/liturgical';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Info, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
// Import specific formatters needed here
import {
  formatPsalmContentStructured,
  formatGospelAcclamationStructured,
  removeCharacterCounts,
  formatReadingContent,
  formatSummary,
  formatDetailedExplanation,
} from '@/utils/formattingUtils';
// Note: formatProseWithQuotes likely not needed anymore

import './paro-summary-bullets.css';

interface ReadingCardProps {
  reading: LiturgicalReading;
}

// Helper function to render content *inside* the card
const renderFormattedContent = (reading: LiturgicalReading) => {
  const titleLower = reading.title.toLowerCase();
  // Use the content directly from props, cleaning happens in service now
  const content = reading.content || '';

  if (titleLower.includes('responsorial psalm')) {
    // ReadingCard uses formatPsalmContentStructured for specific Psalm formatting
    const formattedPsalm = formatPsalmContentStructured(content); // Pass raw content from service
    return formattedPsalm.map((line, idx) => {
      switch (line.type) {
        case 'response':
          return <strong key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></strong>;
        case 'verse_part1':
          return <div key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></div>;
        case 'verse_part2':
          return (
            <div
              key={idx}
              style={{ paddingLeft: '2em' }}
              dangerouslySetInnerHTML={{ __html: line.text }}
            ></div>
          );
        case 'blank':
          return <div key={idx} style={{ marginBottom: '0.75em' }}></div>;
        default:
          return null;
      }
    });
  } else if (titleLower.includes('gospel acclamation')) {
    // ReadingCard uses formatGospelAcclamationStructured for specific formatting
    const formattedAcclamation = formatGospelAcclamationStructured(content); // Pass raw content from service
    return formattedAcclamation.map((line, idx) => {
      switch (line.type) {
        case 'main_sentence':
          return <strong key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></strong>;
        case 'verse_part1':
          return <div key={idx} dangerouslySetInnerHTML={{ __html: line.text }}></div>;
        case 'verse_part2':
          return (
            <div
              key={idx}
              style={{ paddingLeft: '2em' }}
              dangerouslySetInnerHTML={{ __html: line.text }}
            ></div>
          );
        case 'blank':
          return <div key={idx} style={{ marginBottom: '0.75em' }}></div>;
        default:
          return null;
      }
    });
  } else if (titleLower.includes('gospel') && content.includes('<div style=')) {
    // Passion Gospel: Render the raw HTML provided by the service
    // Wrap with a class for CSS targeting
    return <div className="prose-passion" dangerouslySetInnerHTML={{ __html: content }} />;
  } else {
    // Default/Prose (First/Second Reading, Standard Gospel, Citations, etc.)
    // Render the HTML formatted by the service (which now includes breaks and wrapping)
    const cleanContent = content.replace(/style=".*?"/g, '');
    return (
      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: cleanContent }} />
    );
  }
};

// Helper function to strip [n] citations from text
function stripCitations(text: string): string {
  return text.replace(/\s*\[\d+\]/g, '');
}

// Helper function to render a list of citations
const renderCitations = (citations: any[]) => {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="font-semibold text-sm mb-2">References</h4>
      {citations.map((citation, index) => {
        // Use the citation id if available, otherwise use index+1
        const citationNumber = citation.id || (index + 1);
        
        // Handle different citation field formats
        const source = citation.source || citation.document_reference || '';
        const author = citation.author || citation.document_author || '';
        const year = citation.year || citation.document_year || '';
        const citedText = citation.cited_text || '';
        
        return (
          <div key={citationNumber} className="text-sm mb-2">
            <div className="flex items-start">
              <span className="font-medium mr-2">[{citationNumber}]</span>
              <div>
                <span className="font-medium">{source}</span>
                {author && (
                  <span className="text-muted-foreground"> — {author}</span>
                )}
                {year && (
                  <span className="text-muted-foreground"> ({year})</span>
                )}
                {citedText && (
                  <div className="mt-1 text-xs italic border-l-2 border-muted pl-3 py-1 text-muted-foreground">
                    "{citedText}"
                  </div>
                )}
                {(citation.url || citation.source_url) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <a 
                      href={citation.url || citation.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-clergy-primary hover:underline"
                    >
                      Source
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ReadingCard = ({ reading }: ReadingCardProps) => {
  // Determine if the summary should be shown
  const showSummary =
    reading.summary !== undefined &&
    reading.summary !== null &&
    reading.summary !== '';

  // Ensure reading content is not null/undefined
  const safeReading = {
    ...reading,
    content: reading.content || '',
    summary: reading.summary || '',
    detailedExplanation: reading.detailedExplanation || '',
    citations: reading.citations || []
  };

  // Debug: Log citations for this reading
  console.log('ReadingCard citations:', safeReading.citations, 'for reading:', safeReading.title);

  // Format citation to replace HTML entity with en-dash
  const formattedCitation = (safeReading.citation || '').replace(/&#x2010;/g, '–');

  // Compose a full title if this reading is an alternative or special memorial
  let fullTitle = safeReading.title;
  if (safeReading.memorialTitle) {
    // If a memorialTitle field exists, prepend it
    fullTitle = `${safeReading.memorialTitle} - ${safeReading.title}`;
  } else if (safeReading.title.toLowerCase().includes('alternative') && safeReading.memorial) {
    // If marked as alternative and has a memorial, prepend memorial
    fullTitle = `${safeReading.memorial} - ${safeReading.title}`;
  }

  return (
    <Card className="reading-card ml-6">
      {/* Add pl-6 for alignment */}
      <CardHeader className="pb-2 pl-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Book className="h-5 w-5 text-clergy-primary" />
          {fullTitle}
        </CardTitle>
        <CardDescription>{formattedCitation}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Section */}
        {showSummary && (
          <>
            {safeReading.summaryLoading && (
              <div className="mb-4 space-y-2 pl-6">
                {' '}
                {/* Add pl-6 here too */}
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
                <div className="paro-summary-bullets text-muted-foreground">
                  <div style={{ height: '1em' }} />
                  <p className="mb-3">{stripCitations(safeReading.summary)}</p>

                  {/* Detailed explanation section with spacing only */}
                  {safeReading.detailedExplanation && (
                    <>
                      <div style={{ height: '1em' }} />
                      <p className="mb-2">{stripCitations(safeReading.detailedExplanation)}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {/* End of Summary Section */}

        {/* Content Rendering */}
        {/* Keep existing pl-6 */}
        <div className="text-base">{renderFormattedContent(safeReading)}</div>
      </CardContent>
    </Card>
  );
};
