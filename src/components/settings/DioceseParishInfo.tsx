import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Church } from 'lucide-react';
import DioceseParishLinks from './DioceseParishLinks';

const DioceseParishInfo = () => (
  <Card className="not-prose p-0 shadow-none border-0 bg-transparent">
    <CardHeader className="pb-2 px-0">
      <CardTitle className="text-xl flex items-center gap-2">
        <Church className="h-5 w-5 text-clergy-primary" />
        Diocese & Parish Info
      </CardTitle>
      <CardDescription className="px-0">Add quick links to your diocese or parish calendars. These will be available as hot buttons in your Resources app page.</CardDescription>
    </CardHeader>
    <CardContent className="px-0">
      <DioceseParishLinks />
    </CardContent>
  </Card>
);

export default DioceseParishInfo;
