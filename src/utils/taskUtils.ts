
import { Task } from "@/components/tasks/TaskDialog";

export type TaskFilter = "all" | "pending" | "completed";

export const sortTasks = (tasksToSort: Task[]): Task[] => {
  return [...tasksToSort].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    const getPriorityValue = (task: Task) => {
      if (task.urgent && task.important) return 1;
      if (task.urgent && !task.important) return 2;
      if (!task.urgent && task.important) return 3;
      return 4;
    };
    
    const aPriority = getPriorityValue(a);
    const bPriority = getPriorityValue(b);
    
    return aPriority - bPriority;
  });
};

export const filterTasks = (tasks: Task[], filter: TaskFilter): Task[] => {
  if (filter === "all") return tasks;
  if (filter === "pending") return tasks.filter(task => !task.completed);
  if (filter === "completed") return tasks.filter(task => task.completed);
  return tasks;
};
