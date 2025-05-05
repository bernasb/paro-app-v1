import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useVoice } from '@/contexts/VoiceContext';
import { Mic, Settings as SettingsIcon } from 'lucide-react';
import DioceseParishLinks from './DioceseParishLinks';
import DioceseParishInfo from './DioceseParishInfo';
import CustomRadioInfo from './CustomRadioInfo';

interface GeneralSettingsProps {
  voiceCommandsEnabled: boolean;
  setVoiceCommandsEnabled: (enabled: boolean) => void;
  userDisplayName: string;
  setUserDisplayName: (name: string) => void;
}

const GeneralSettings = ({
  voiceCommandsEnabled,
  setVoiceCommandsEnabled,
  userDisplayName,
  setUserDisplayName,
}: GeneralSettingsProps) => {
  // Use the correct function name from the context
  const { isWakeWordEnabled, toggleWakeWord } = useVoice();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-clergy-primary" />
          General Settings
        </CardTitle>
        <CardDescription>Manage application preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Preferred Name Section */}
          <div className="space-y-0.5">
            <Label htmlFor="display-name">How should we address you?</Label>
            <p className="text-sm text-muted-foreground">(e.g., Father John, Ms. Smith, Sister Cathy, Hudson Family, etc.)</p>
            <div className="mt-4">
              <input
                id="display-name"
                type="text"
                className="input input-bordered w-96 px-3 py-2 rounded border border-gray-600 focus:outline-none transition-all duration-200 bg-gray-800 text-white placeholder-gray-400"
                value={userDisplayName}
                onChange={e => setUserDisplayName(e.target.value)}
                placeholder="Your preferred name"
              />
              {userDisplayName && (
                <div className="mt-2 px-3 py-2 rounded shadow text-base font-semibold inline-block bg-gray-900 text-white border border-gray-700">
                  {userDisplayName}
                </div>
              )}
            </div>
          </div>

          {/* Diocese & Parish Info Section */}
          <DioceseParishInfo />
          {/* Custom Radio Stations Section (below Diocese & Parish) */}
          <CustomRadioInfo />
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;
