import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

const EmailInbox = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Inbox</CardTitle>
        <CardDescription>Your received emails will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-center py-8">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            Your Gmail inbox is connected but no emails to display yet
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailInbox;
