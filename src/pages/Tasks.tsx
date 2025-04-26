
import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc // Add deleteDoc
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client"; // Import Firestore instance
import { useGoogleAuth } from "@/contexts/GoogleAuthContext"; // Import auth hook
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckSquare, 
  Plus, 
  ListFilter,
  Trash2 // Add Trash icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskDialog, Task } from "@/components/tasks/TaskDialog";
import { TaskList } from "@/components/tasks/TaskList";
import { sortTasks, filterTasks, TaskFilter } from "@/utils/taskUtils";
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Remove initialTasks - we will fetch from Firestore
// const initialTasks: Task[] = [ ... ];

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state for tasks
  const { user, loading: authLoading } = useGoogleAuth(); // Get user and auth loading state
  const { toast } = useToast(); // Get toast function

  // --- Firestore Fetching --- 
  useEffect(() => {
    if (!user) { 
      // If no user, clear tasks and stop loading (or wait for auth)
      setTasks([]);
      setIsLoading(false);
      return; 
    }

    setIsLoading(true); // Start loading tasks
    // Create a query to get tasks for the current user
    const tasksCollectionRef = collection(db, "users", user.uid, "tasks");
    const q = query(tasksCollectionRef); // Add orderBy here if needed, e.g., query(tasksCollectionRef, orderBy("dueDate"))

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        // Important: Convert Firestore data to Task type
        // Ensure Firestore fields match Task interface
        fetchedTasks.push({ 
            ...doc.data(), // Spread the document data
            id: doc.id // Use Firestore document ID as task ID
        } as Task); 
      });
      setTasks(fetchedTasks);
      setIsLoading(false); // Tasks loaded
      console.log("Tasks fetched/updated:", fetchedTasks);
    }, (error) => {
      console.error("Error fetching tasks: ", error);
      toast({ title: "Error", description: "Could not fetch tasks.", variant: "destructive" });
      setIsLoading(false); // Stop loading on error
    });

    // Cleanup subscription on unmount or when user changes
    return () => unsubscribe();
  }, [user, toast]); // Re-run effect if user changes

  // --- Firestore Writing Functions (to be implemented next) ---
  const toggleTaskCompletion = async (id: string | number) => {
    if (!user || typeof id !== 'string') return; // Ensure user and string ID
    const taskRef = doc(db, "users", user.uid, "tasks", id);
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    try {
      await updateDoc(taskRef, { completed: !taskToUpdate.completed });
      // No need to setTasks, onSnapshot will update the UI
      // toast({ title: "Task Updated", description: `Task marked as ${!taskToUpdate.completed ? 'complete' : 'pending'}.` });
    } catch (error) {
      console.error("Error updating task completion: ", error);
      toast({ title: "Error", description: "Could not update task completion.", variant: "destructive" });
    }
  };

  const toggleTaskUrgent = async (id: string | number) => {
    if (!user || typeof id !== 'string') return;
    const taskRef = doc(db, "users", user.uid, "tasks", id);
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    try {
      await updateDoc(taskRef, { urgent: !taskToUpdate.urgent });
    } catch (error) {
      console.error("Error updating task urgency: ", error);
      toast({ title: "Error", description: "Could not update task urgency.", variant: "destructive" });
    }
  };

  const toggleTaskImportant = async (id: string | number) => {
    if (!user || typeof id !== 'string') return;
    const taskRef = doc(db, "users", user.uid, "tasks", id);
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    try {
      await updateDoc(taskRef, { important: !taskToUpdate.important });
    } catch (error) {
      console.error("Error updating task importance: ", error);
      toast({ title: "Error", description: "Could not update task importance.", variant: "destructive" });
    }
  };

  const handleSaveTask = async (taskToSave: Task) => {
    if (!user) return;

    const { id, ...taskData } = taskToSave; // Separate ID from the rest of the data

    try {
      if (id && tasks.some(task => task.id === id)) {
        // Update existing task
        if (typeof id !== 'string') throw new Error("Invalid ID type for update");
        const taskRef = doc(db, "users", user.uid, "tasks", id);
        await updateDoc(taskRef, taskData);
        toast({ title: "Task Updated", description: `"${taskData.title}" updated successfully.` });
      } else {
        // Add new task (Firestore will generate ID)
        const tasksCollectionRef = collection(db, "users", user.uid, "tasks");
        await addDoc(tasksCollectionRef, taskData); 
        toast({ title: "Task Added", description: `"${taskData.title}" added successfully.` });
      }
      setDialogOpen(false); // Close dialog on success
      // UI will update via onSnapshot
    } catch (error) {
        console.error("Error saving task: ", error);
        toast({ title: "Error", description: "Could not save task.", variant: "destructive" });
    }
  };
  
  const handleDeleteTask = async (id: string | number) => {
      if (!user || typeof id !== 'string') return;
      const taskRef = doc(db, "users", user.uid, "tasks", id);
      try {
          await deleteDoc(taskRef);
          toast({ title: "Task Deleted", description: "Task removed successfully." });
          // UI will update via onSnapshot
      } catch (error) {
          console.error("Error deleting task: ", error);
          toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
      }
  };

  const handleOpenTaskDialog = (task: Task | null) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  // --- Filtering and Sorting --- 
  // Ensure tasks is always an array before filtering/sorting
  const tasksToDisplay = tasks || [];
  const filteredTasks = sortTasks(filterTasks(tasksToDisplay, filter));

  // --- Render Logic --- 
  if (authLoading) {
    // Show loading skeleton while checking auth
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }
  
  if (!user) {
      // Show message if user is not logged in
      return (
          <div className="space-y-6 animate-fade-in text-center">
             <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Tasks Unavailable</CardTitle>
                    <CardDescription>Please sign in to manage your tasks.</CardDescription>
                </CardHeader>
                {/* Optionally add a sign-in button here */}
             </Card>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button 
          className="gap-2 bg-clergy-primary hover:bg-clergy-primary/90"
          onClick={() => handleOpenTaskDialog(null)}
          disabled={isLoading} // Disable if loading tasks
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-clergy-primary" />
              Task Management
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
                    <ListFilter className="h-4 w-4" />
                    {filter === "all" ? "All Tasks" : filter === "pending" ? "Pending" : "Completed"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilter("all")}>All Tasks</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("pending")}>Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("completed")}>Completed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription>Manage your ministry and personal tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Show loading skeletons for tasks
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <TaskList
              tasks={filteredTasks}
              onTaskClick={handleOpenTaskDialog}
              onToggleCompletion={toggleTaskCompletion}
              onToggleUrgent={toggleTaskUrgent}
              onToggleImportant={toggleTaskImportant}
              onDeleteTask={handleDeleteTask} // Pass delete handler
            />
          )}
        </CardContent>
      </Card>

      {/* Ensure TaskDialog receives the correct ID type (string) */}
      <TaskDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        onSave={handleSaveTask}
      />
    </div>
  );
};

export default Tasks;
