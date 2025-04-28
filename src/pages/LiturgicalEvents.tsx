import { useState, useEffect } from 'react';
import { getLiturgicalEvents } from '@/utils/magisterium';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { LiturgicalEventsDisplay } from '@/components/liturgical/LiturgicalEventsDisplay';
import { ColorGuide } from '@/components/liturgical/ColorGuide';
import { useLiturgicalEvents } from '@/hooks/use-liturgical-events';

export default function LiturgicalEvents() {
  const { events, isLoading, getColorClass } = useLiturgicalEvents();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Liturgical Calendar</h1>
        <div className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5 text-clergy-primary" />
            Liturgical Calendar
          </CardTitle>
          <CardDescription>Upcoming liturgical events and their colors</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="mb-4">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-1/3" />
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
          ) : (
            <LiturgicalEventsDisplay
              events={events}
              getColorClass={getColorClass}
              loading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      <ColorGuide getColorClass={getColorClass} />
    </div>
  );
}
