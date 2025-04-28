import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, UserPlus, X, Save, Mail } from 'lucide-react';

type EmailGroup = {
  id: string;
  name: string;
  emails: string[];
};

type EmailGroupsProps = {
  onSelectGroup: (group: EmailGroup) => void;
};

export function EmailGroups({ onSelectGroup }: EmailGroupsProps) {
  const [groups, setGroups] = useState<EmailGroup[]>([
    { id: '1', name: 'Parish Staff', emails: ['staff1@example.com', 'staff2@example.com'] },
    { id: '2', name: 'Pastoral Council', emails: ['council1@example.com', 'council2@example.com'] },
  ]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddGroup = () => {
    if (!newGroupName) {
      toast({
        title: 'Group name required',
        description: 'Please provide a name for the group.',
        variant: 'destructive',
      });
      return;
    }

    const emails = newGroupEmails
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      toast({
        title: 'Emails required',
        description: 'Please add at least one email address.',
        variant: 'destructive',
      });
      return;
    }

    const newGroup: EmailGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      emails: emails,
    };

    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setNewGroupEmails('');
    setIsDialogOpen(false);

    toast({
      title: 'Group created',
      description: `${newGroupName} has been added to your groups.`,
    });
  };

  const handleSelectGroup = (group: EmailGroup) => {
    onSelectGroup(group);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-clergy-primary" />
          Email Groups
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span>New Group</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Email Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Parish Staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-emails">Email Addresses</Label>
                <Input
                  id="group-emails"
                  value={newGroupEmails}
                  onChange={(e) => setNewGroupEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple email addresses with commas
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddGroup} className="gap-2">
                <Save className="h-4 w-4" />
                Save Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <div className="space-y-3">
        {groups.map((group) => (
          <Card key={group.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{group.name}</h3>
                  <p className="text-xs text-muted-foreground">{group.emails.length} recipients</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSelectGroup(group)}
                  className="gap-1"
                >
                  <Mail className="h-4 w-4" />
                  <span>Select</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
