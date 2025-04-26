
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Clock, Trash2 } from "lucide-react"; // Add Trash2
import { Task } from "./TaskDialog";

interface TaskItemProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  // Update ID type to string | number
  onToggleCompletion: (id: string | number) => void;
  onToggleUrgent: (id: string | number) => void;
  onToggleImportant: (id: string | number) => void;
  onDeleteTask: (id: string | number) => void; // Add onDeleteTask prop
}

export const TaskItem = ({
  task,
  onTaskClick,
  onToggleCompletion,
  onToggleUrgent,
  onToggleImportant,
  onDeleteTask // Destructure prop
}: TaskItemProps) => {

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onTaskClick
    onDeleteTask(task.id);
  };

  return (
    <div 
      // key is handled in TaskList, no need here
      // Corrected className syntax: swapped ` and }
      className={`flex items-start gap-3 p-4 rounded-md border ${task.completed ? "bg-muted/30 border-muted" : "bg-accent/20 border-border"} transition-colors group relative`}
      onClick={() => onTaskClick(task)} // Allow clicking anywhere to edit
    >
      {/* Completion Toggle Button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 rounded-full p-0 mt-0.5 flex-shrink-0" // Added flex-shrink-0
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering onTaskClick
          onToggleCompletion(task.id);
        }}
      >
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-clergy-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>
      
      {/* Task Title and Due Date */}
      <div className="flex-1 min-w-0 mr-2"> {/* Added min-w-0 and margin */}
        <h3 
          className={`font-medium break-words ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
          onClick={() => onTaskClick(task)} // Make title clickable too
        >
          {task.title}
        </h3>
        {task.dueDate && (
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span>Due: {task.dueDate}</span>
          </div>
        )}
      </div>
      
      {/* Priority Toggles */}
      <div className="flex flex-col items-end space-y-1 ml-auto flex-shrink-0"> {/* Added flex-shrink-0 */}
        <div className="flex items-center gap-2">
          <Label htmlFor={`urgent-${task.id}`} className="text-xs">Urgent</Label>
          <Checkbox 
            id={`urgent-${task.id}`} 
            checked={task.urgent} 
            onCheckedChange={() => {
              onToggleUrgent(task.id);
            }} 
            className="h-4 w-4 data-[state=checked]:bg-destructive"
            onClick={(e) => e.stopPropagation()} // Prevent task click
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`important-${task.id}`} className="text-xs">Important</Label>
          <Checkbox 
            id={`important-${task.id}`} 
            checked={task.important} 
            onCheckedChange={() => {
              onToggleImportant(task.id);
            }}
            className="h-4 w-4 data-[state=checked]:bg-clergy-secondary"
            onClick={(e) => e.stopPropagation()} // Prevent task click
          />
        </div>
      </div>

      {/* Delete Button (using AlertDialog for confirmation) */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={(e) => e.stopPropagation()} // Prevent triggering onTaskClick
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}> 
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task:
              <br />
              <strong className="break-words">"{task.title}"</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClick} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};
