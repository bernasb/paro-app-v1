import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Task } from '@/components/tasks/TaskDialog';
import { sortTasks } from '@/utils/taskUtils';

// Updated mock data for task progress
const taskProgress = {
  completed: 3,
  total: 8,
  percentage: 37.5,
};

// Updated mock data for pending tasks with new date format
const pendingTasks: Task[] = [
  {
    id: 1,
    title: 'Prepare Sunday Homily',
    dueDate: 'Friday, 4/5/25, 5:00 PM',
    completed: false,
    urgent: true,
    important: true,
  },
  {
    id: 2,
    title: 'Call Mrs. Johnson about baptism',
    dueDate: 'Monday, 4/1/25, 3:00 PM',
    completed: false,
    urgent: true,
    important: false,
  },
  {
    id: 3,
    title: 'Review choir music selections',
    dueDate: 'Tuesday, 4/2/25, 12:00 PM',
    completed: false,
    urgent: false,
    important: true,
  },
];

// Sort tasks by priority categories
const sortedTasks = sortTasks(pendingTasks.filter((task) => !task.completed));

export function TaskOverviewCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-clergy-primary" />
          Task Overview
        </CardTitle>
        <CardDescription>
          {taskProgress.completed} of {taskProgress.total} tasks completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={taskProgress.percentage} className="h-2" />
          <div className="text-sm text-muted-foreground text-right">
            {taskProgress.percentage.toFixed(0)}% complete
          </div>
        </div>

        <h3 className="font-medium text-sm text-muted-foreground mt-4">PENDING TASKS</h3>
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-md bg-accent/20 border border-border"
            >
              <div className="flex-1 flex">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{task.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
                <div className="min-w-[100px]">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor={`urgent-overview-${task.id}`} className="text-xs text-left">
                      Urgent
                    </Label>
                    <Checkbox
                      id={`urgent-overview-${task.id}`}
                      checked={task.urgent}
                      className="h-4 w-4 data-[state=checked]:bg-destructive"
                      disabled
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`important-overview-${task.id}`} className="text-xs text-left">
                      Important
                    </Label>
                    <Checkbox
                      id={`important-overview-${task.id}`}
                      checked={task.important}
                      className="h-4 w-4 data-[state=checked]:bg-clergy-secondary"
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
