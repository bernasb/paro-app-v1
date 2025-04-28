import { LiturgicalEvent } from '@/utils/magisterium';
import { Card, CardContent } from '@/components/ui/card';
import { differenceInDays, format } from 'date-fns';

interface EventCardProps {
  event: LiturgicalEvent;
  getColorClass: (color: string) => string;
}

export const EventCard = ({ event, getColorClass }: EventCardProps) => {
  const eventDate = new Date(event.date);
  const today = new Date();
  const daysUntil = differenceInDays(eventDate, today);

  let timeFrame = '';
  if (daysUntil === 0) timeFrame = 'Today';
  else if (daysUntil === 1) timeFrame = 'Tomorrow';
  else timeFrame = `In ${daysUntil} days`;

  return (
    <Card className="overflow-hidden">
      <div className={`h-2 ${getColorClass(event.color)}`}></div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold">{event.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(eventDate, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">{event.importance}</span>
            <div className={`h-4 w-4 rounded-full ${getColorClass(event.color)}`}></div>
          </div>
        </div>
        <p className="text-sm mb-2">{event.description}</p>
        <div className="text-xs bg-muted inline-block px-2 py-1 rounded">{timeFrame}</div>
      </CardContent>
    </Card>
  );
};
