import { TaskItem } from './TaskItem';
import { Task } from './TaskDialog';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  // Update ID type to string | number in props
  onToggleCompletion: (id: string | number) => void;
  onToggleUrgent: (id: string | number) => void;
  onToggleImportant: (id: string | number) => void;
  onDeleteTask: (id: string | number) => void; // Add onDeleteTask prop
}

export const TaskList = ({
  tasks,
  onTaskClick,
  onToggleCompletion,
  onToggleUrgent,
  onToggleImportant,
  onDeleteTask, // Destructure the new prop
}: TaskListProps) => {
  if (tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No tasks to display</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          // Ensure key is string if task.id is number
          key={String(task.id)}
          task={task}
          onTaskClick={onTaskClick}
          onToggleCompletion={onToggleCompletion}
          onToggleUrgent={onToggleUrgent}
          onToggleImportant={onToggleImportant}
          onDeleteTask={onDeleteTask} // Pass onDeleteTask down to TaskItem
        />
      ))}
    </div>
  );
};
