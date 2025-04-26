
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TaskPriorityOptionsProps {
  completed: boolean;
  urgent: boolean;
  important: boolean;
  onCompletedChange: (checked: boolean) => void;
  onUrgentChange: (checked: boolean) => void;
  onImportantChange: (checked: boolean) => void;
}

export const TaskPriorityOptions = ({
  completed,
  urgent,
  important,
  onCompletedChange,
  onUrgentChange,
  onImportantChange,
}: TaskPriorityOptionsProps) => {
  return (
    <div className="flex flex-col gap-3 mt-2">
      <div className="flex items-center gap-2">
        <Checkbox 
          id="completed" 
          checked={completed}
          onCheckedChange={(checked) => 
            onCompletedChange(checked === true)
          }
        />
        <Label htmlFor="completed">Completed</Label>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox 
          id="urgent" 
          checked={urgent}
          className="data-[state=checked]:bg-destructive"
          onCheckedChange={(checked) => 
            onUrgentChange(checked === true)
          }
        />
        <Label htmlFor="urgent">Urgent</Label>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox 
          id="important" 
          checked={important}
          className="data-[state=checked]:bg-clergy-secondary"
          onCheckedChange={(checked) => 
            onImportantChange(checked === true)
          }
        />
        <Label htmlFor="important">Important</Label>
      </div>
    </div>
  );
};
