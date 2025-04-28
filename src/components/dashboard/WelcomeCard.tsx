import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export function WelcomeCard() {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    let newGreeting = '';

    if (hour < 12) {
      newGreeting = 'Good morning';
    } else if (hour < 18) {
      newGreeting = 'Good afternoon';
    } else {
      newGreeting = 'Good evening';
    }

    setGreeting(newGreeting);

    // Format current time
    const formatTime = () => {
      const date = new Date();
      setCurrentTime(
        date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }) +
          ' - ' +
          date.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }),
      );
    };

    formatTime();
    const interval = setInterval(formatTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gradient-to-br from-clergy-primary/90 to-clergy-secondary/90 text-white border-none shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold">{greeting}, Father</CardTitle>
        <CardDescription className="text-white/80">{currentTime}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          Welcome to your personalized ministry assistant. Use voice commands or navigate through
          the sidebar to manage your schedule, tasks, and resources.
        </p>
      </CardContent>
    </Card>
  );
}
