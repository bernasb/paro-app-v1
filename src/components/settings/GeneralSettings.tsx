
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useVoice } from "@/contexts/VoiceContext";
import { Mic, Radio, Settings as SettingsIcon } from "lucide-react";

interface GeneralSettingsProps {
  darkModeEnabled: boolean;
  setDarkModeEnabled: (enabled: boolean) => void;
  voiceCommandsEnabled: boolean;
  setVoiceCommandsEnabled: (enabled: boolean) => void;
}

const GeneralSettings = ({
  darkModeEnabled,
  setDarkModeEnabled,
  voiceCommandsEnabled,
  setVoiceCommandsEnabled
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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use dark theme across the application
              </p>
            </div>
            <Switch 
              id="dark-mode" 
              checked={darkModeEnabled} 
              onCheckedChange={setDarkModeEnabled} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2" htmlFor="voice-commands">
                <Mic className="h-4 w-4 text-clergy-primary" />
                Voice Commands
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable voice commands for hands-free operation
              </p>
            </div>
            <Switch 
              id="voice-commands" 
              checked={voiceCommandsEnabled} 
              onCheckedChange={setVoiceCommandsEnabled} 
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2" htmlFor="wake-word">
                <Radio className="h-4 w-4 text-clergy-primary" />
                Wake Word Detection
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable "paro" wake word for hands-free activation
              </p>
            </div>
            <Switch 
              id="wake-word" 
              checked={isWakeWordEnabled} 
              // Call the correct function on change
              onCheckedChange={toggleWakeWord} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;
