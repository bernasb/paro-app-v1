import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useVoice } from '@/contexts/VoiceContext';
import { Mic, Settings as SettingsIcon } from 'lucide-react';

interface GeneralSettingsProps {
  darkModeEnabled: boolean;
  setDarkModeEnabled: (enabled: boolean) => void;
  voiceCommandsEnabled: boolean;
  setVoiceCommandsEnabled: (enabled: boolean) => void;
  userDisplayName: string;
  setUserDisplayName: (name: string) => void;
}

const GeneralSettings = ({
  darkModeEnabled,
  setDarkModeEnabled,
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
                className={`input input-bordered w-96 px-3 py-2 rounded border border-gray-300 focus:outline-none transition-all duration-200 ${darkModeEnabled ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400' : 'bg-white text-black'}`}
                value={userDisplayName}
                onChange={e => setUserDisplayName(e.target.value)}
                placeholder="Your preferred name"
              />
              {userDisplayName && (
                <div className={`mt-2 px-3 py-2 rounded shadow text-base font-semibold inline-block ${darkModeEnabled ? 'bg-gray-900 text-white border border-gray-700' : 'bg-gray-100 text-gray-900 border border-gray-300'}`}>
                  {userDisplayName}
                </div>
              )}
            </div>
          </div>

          {/* Settings Switches, stacked with slider below description */}
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Use dark theme across the application</p>
              <Switch id="dark-mode" checked={darkModeEnabled} onCheckedChange={setDarkModeEnabled} />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2" htmlFor="voice-commands">
                <Mic className="h-4 w-4 text-clergy-primary" />
                Voice Commands
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable voice commands for hands-free operation
              </p>
              <Switch
                id="voice-commands"
                checked={voiceCommandsEnabled}
                onCheckedChange={setVoiceCommandsEnabled}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2" htmlFor="wake-word">
                <Mic className="h-4 w-4 text-clergy-primary" />
                Wake Word Detection
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable "paro" wake word for hands-free activation
              </p>
              <Switch
                id="wake-word"
                checked={isWakeWordEnabled}
                onCheckedChange={toggleWakeWord}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;
