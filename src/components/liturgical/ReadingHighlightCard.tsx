// src/components/liturgical/ReadingHighlightCard.tsx

import { LiturgicalReading } from '@/types/liturgical';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book } from 'lucide-react';
import { formatReadingContent } from '@/utils/formattingUtils'; // Only need this for summary formatting

interface ReadingHighlightCardProps {
  reading: LiturgicalReading;
}

export const ReadingHighlightCard = ({ reading }: ReadingHighlightCardProps) => {
  // Determine if the summary should be shown (hide for Gospel Acclamation, though it should be filtered out before reaching here)
  const showSummary = !reading.title.toLowerCase().includes('gospel acclamation');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Book className="h-5 w-5 text-clergy-primary" />
          {reading.title}
        </CardTitle>
        <CardDescription>{reading.citation}</CardDescription>
      </CardHeader>
      {/* Only include CardContent if there's a summary to display */}
      {showSummary && reading.summary && (
        <CardContent>
          {/* Summary Section */}
          <p
            className="italic text-base text-muted-foreground whitespace-pre-wrap" // Use text-base like main content, apply formatting
            dangerouslySetInnerHTML={{ __html: formatReadingContent(reading.summary) }}
          />
          {/* End of Summary Section */}
        </CardContent>
      )}
    </Card>
  );
};
