import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mic } from 'lucide-react';
import { useVoice } from '@/contexts/VoiceContext';

interface VoiceCommandsSettingsProps {
  voiceCommandsEnabled: boolean;
  setVoiceCommandsEnabled: (enabled: boolean) => void;
}

const VoiceCommandsSettings = ({
  voiceCommandsEnabled,
  setVoiceCommandsEnabled,
}: VoiceCommandsSettingsProps) => {
  const { isWakeWordEnabled, toggleWakeWord } = useVoice();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Mic className="h-5 w-5 text-clergy-primary" />
          Voice Commands
        </CardTitle>
        <CardDescription>Enable and configure voice command features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
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
      </CardContent>
    </Card>
  );
};

export default VoiceCommandsSettings;
