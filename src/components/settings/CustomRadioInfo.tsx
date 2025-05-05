import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Radio } from 'lucide-react';
import CustomRadioStations from './CustomRadioStations';

const CustomRadioInfo = () => (
  <Card className="not-prose p-0 shadow-none border-0 bg-transparent">
    <CardHeader className="pb-2 px-0">
      <CardTitle className="text-xl flex items-center gap-2">
        <Radio className="h-5 w-5 text-clergy-primary" />
        Add Custom Radio Stations
      </CardTitle>
      <CardDescription className="px-0">Manage your favorite custom radio stations for quick access in Resources</CardDescription>
    </CardHeader>
    <CardContent className="px-0">
      <CustomRadioStations />
    </CardContent>
  </Card>
);

export default CustomRadioInfo;
