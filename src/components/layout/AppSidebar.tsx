import { useState } from 'react';
import { LucideProps } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Home,
  Mail,
  Mic,
  Radio,
  Settings,
  User,
  Book,
  Circle,
  Shield,
  Cross,
} from 'lucide-react';

const BotIcon = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-bot h-4 w-4"
    {...props}
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);
const navItems = [
  {
    name: 'Dashboard',
    path: '/',
    icon: Home,
  },
  {
    name: 'Calendar',
    path: '/calendar',
    icon: Calendar,
  },
  {
    name: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Email',
    path: '/email',
    icon: Mail,
  },
  {
    name: 'Vatican News',
    path: '/vatican-news',
    icon: Cross,
  },
  {
    name: 'Mass Readings',
    path: '/daily-readings',
    icon: Book,
  },
  {
    name: 'AI Assistant',
    path: '/ai-assistant',
    icon: BotIcon,
  },
  {
    name: 'Liturgical Events',
    path: '/liturgical-events',
    icon: Circle,
  },
  {
    name: 'Saints & History',
    path: '/saints-history',
    icon: User,
  },
  {
    name: 'Catholic Prayers',
    path: '/catholic-prayers',
    icon: Book,
  },
  {
    name: 'Resources',
    path: '/resources',
    icon: Radio,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
  },
  {
    name: 'Admin',
    path: '/admin',
    icon: Shield,
  },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center">
            <img
              src="/logo-image/1068bbbe-af3f-4ab1-8f81-c31109138fe7.png"
              alt="ClergyConnect Logo"
              className="h-8"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((prev) => !prev)}
          className="ml-auto"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      <div className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
              location.pathname === item.path && 'bg-primary text-primary-foreground',
            )}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </div>

      <div className="p-2 border-t border-sidebar-border">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <User size={20} />
          {!collapsed && <span>Profile</span>}
        </Link>
      </div>
    </div>
  );
}
