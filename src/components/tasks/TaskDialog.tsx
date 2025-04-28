import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateTimeSelection } from './DateTimeSelection';
import { TaskPriorityOptions } from './TaskPriorityOptions';
import { formatDueDateTime, parseDueDateTime } from '@/utils/dateTimeUtils';

// Update Task type ID to string | number
export type Task = {
  id: string | number; // Allow string for Firestore IDs, number for potential temporary IDs
  title: string;
  dueDate: string | null;
  completed: boolean;
  urgent: boolean;
  important: boolean;
};

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onSave: (task: Task) => void;
};

export function TaskDialog({ open, onOpenChange, task, onSave }: TaskDialogProps) {
  // Initialize ID with null or a temporary value for new tasks
  const [editedTask, setEditedTask] = useState<Task>({
    id: task?.id || Date.now(), // Use existing ID or generate temporary one
    title: task?.title || '',
    dueDate: task?.dueDate || null,
    completed: task?.completed || false,
    urgent: task?.urgent || false,
    important: task?.important || false,
  });

  // Track the date and time separately
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('12:00 PM');
  const [noDueDate, setNoDueDate] = useState<boolean>(true);

  // Reset form when task or open state changes
  useEffect(() => {
    if (open) {
      if (task) {
        setEditedTask(task);
        setNoDueDate(!task.dueDate);
        const { date, time } = parseDueDateTime(task.dueDate);
        setSelectedDate(date);
        setSelectedTime(time);
      } else {
        // Reset to default state for a new task
        setEditedTask({
          id: Date.now(), // Generate new temporary ID
          title: '',
          dueDate: null,
          completed: false,
          urgent: false,
          important: false,
        });
        setSelectedDate(undefined);
        setSelectedTime('12:00 PM');
        setNoDueDate(true);
      }
    }
    // If keeping temporary ID generation, we might not need 'task' in deps, but 'open' is important
    // to reset the form when the dialog opens for a *new* task.
  }, [task, open]);

  const handleSave = () => {
    const updatedTask = {
      ...editedTask,
      dueDate: formatDueDateTime(selectedDate, selectedTime, noDueDate),
    };

    // Pass the task with its current ID (could be number or string)
    onSave(updatedTask);
    onOpenChange(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setNoDueDate(false);
    }
  };

  const handleNoDueDateToggle = (checked: boolean) => {
    setNoDueDate(checked);
    if (checked) {
      setEditedTask({ ...editedTask, dueDate: null });
    }
  };

  const clearDate = () => {
    setSelectedDate(undefined);
    setNoDueDate(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <DateTimeSelection
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            noDueDate={noDueDate}
            onDateSelect={handleDateSelect}
            onTimeChange={(time) => setSelectedTime(time)}
            onNoDueDateToggle={handleNoDueDateToggle}
            onClearDate={clearDate}
          />

          <TaskPriorityOptions
            completed={editedTask.completed}
            urgent={editedTask.urgent}
            important={editedTask.important}
            onCompletedChange={(checked) => setEditedTask({ ...editedTask, completed: checked })}
            onUrgentChange={(checked) => setEditedTask({ ...editedTask, urgent: checked })}
            onImportantChange={(checked) => setEditedTask({ ...editedTask, important: checked })}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
