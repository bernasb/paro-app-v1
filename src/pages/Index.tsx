
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { TaskOverviewCard } from "@/components/dashboard/TaskOverviewCard";
import { AIAssistantCard } from "@/components/dashboard/AIAssistantCard";
import { ResourcesCard } from "@/components/dashboard/ResourcesCard";

const Dashboard = () => {
  return (
    <div className="space-y-6 h-full animate-fade-in">
      <WelcomeCard />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UpcomingEventsCard />
        <TaskOverviewCard />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AIAssistantCard />
        <ResourcesCard />
      </div>
    </div>
  );
};

export default Dashboard;
