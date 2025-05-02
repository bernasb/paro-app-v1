import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { UpcomingEventsCard } from '@/components/dashboard/UpcomingEventsCard';
import { TaskOverviewCard } from '@/components/dashboard/TaskOverviewCard';

const Dashboard = () => {
  return (
    <div className="space-y-6 h-full animate-fade-in">
      <WelcomeCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UpcomingEventsCard />
        <TaskOverviewCard />
      </div>

      {/* Removed AIAssistantCard and ResourcesCard as requested */}
    </div>
  );
};

export default Dashboard;
