
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileEdit, Send, Users } from "lucide-react";
import { EmailGroups } from "./EmailGroups";

interface ComposeEmailProps {
  onSendEmail: () => void;
  onCancel: () => void;
}

const ComposeEmail = ({ onSendEmail, onCancel }: ComposeEmailProps) => {
  const handleSelectGroup = (group: any) => {
    console.log("Selected group:", group);
    // You would typically set the recipients here
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          Compose Email
        </CardTitle>
        <CardDescription>Write a new email</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input id="to" placeholder="recipient@example.com" />
              </div>
              <Button variant="outline" className="gap-2">
                <Users size={16} />
                Groups
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Email subject" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Write your message here..." className="min-h-[200px]" />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              className="gap-2 bg-clergy-primary hover:bg-clergy-primary/90"
              onClick={onSendEmail}
            >
              <Send size={16} />
              Send Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComposeEmail;
