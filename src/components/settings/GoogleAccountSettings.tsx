import React from 'react';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, LogOut, Mail } from 'lucide-react';

interface GoogleAccountSettingsProps {
  calendarSyncEnabled: boolean;
  setCalendarSyncEnabled: (enabled: boolean) => void;
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
}

const GoogleAccountSettings = ({
  calendarSyncEnabled,
  setCalendarSyncEnabled,
  emailNotificationsEnabled,
  setEmailNotificationsEnabled,
}: GoogleAccountSettingsProps) => {
  const { isAuthenticated, userEmail, logout } = useGoogleAuth();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Mail className="h-5 w-5 text-clergy-primary" />
          Google Account Settings
        </CardTitle>
        <CardDescription>Manage your Google account connections</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Connected Account</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <Button variant="outline" onClick={logout} className="gap-2">
                <LogOut size={16} />
                Disconnect
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2" htmlFor="calendar-sync">
                <Calendar className="h-4 w-4 text-clergy-primary" />
                Calendar Integration
              </Label>
              <p className="text-sm text-muted-foreground">Allow access to your Google Calendar</p>
              <Switch
                id="calendar-sync"
                checked={calendarSyncEnabled}
                onCheckedChange={setCalendarSyncEnabled}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2" htmlFor="email-notifications">
                <Mail className="h-4 w-4 text-clergy-primary" />
                Gmail Integration
              </Label>
              <p className="text-sm text-muted-foreground">Allow access to your Gmail account</p>
              <Switch
                id="email-notifications"
                checked={emailNotificationsEnabled}
                onCheckedChange={setEmailNotificationsEnabled}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="mb-2">No Google account connected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google account to enable Calendar and Gmail integration
            </p>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/email')}
              className="mx-auto"
            >
              Connect Google Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAccountSettings;
