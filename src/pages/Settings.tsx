import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import GoogleAccountSettings from '@/components/settings/GoogleAccountSettings';
import GeneralSettings from '@/components/settings/GeneralSettings';
import RadioSettings from '@/components/settings/RadioSettings';

const Settings = () => {
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(true);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const { toast } = useToast();

  const handleSaveSettings = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your settings have been saved successfully.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Settings</h1>

      <GoogleAccountSettings
        calendarSyncEnabled={calendarSyncEnabled}
        setCalendarSyncEnabled={setCalendarSyncEnabled}
        emailNotificationsEnabled={emailNotificationsEnabled}
        setEmailNotificationsEnabled={setEmailNotificationsEnabled}
      />

      <GeneralSettings
        darkModeEnabled={darkModeEnabled}
        setDarkModeEnabled={setDarkModeEnabled}
        voiceCommandsEnabled={voiceCommandsEnabled}
        setVoiceCommandsEnabled={setVoiceCommandsEnabled}
      />

      <RadioSettings />

      <Button
        onClick={handleSaveSettings}
        className="w-full gap-2 bg-clergy-primary hover:bg-clergy-primary/90"
      >
        <Save className="h-4 w-4" />
        Save All Settings
      </Button>
    </div>
  );
};

export default Settings;
