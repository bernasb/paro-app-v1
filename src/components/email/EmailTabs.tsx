
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Inbox, 
  Send, 
  Star, 
  Trash, 
  FileEdit,
} from "lucide-react";
import EmailInbox from "./EmailInbox";
import EmailSent from "./EmailSent";
import EmailStarred from "./EmailStarred";
import EmailTrash from "./EmailTrash";
import ComposeEmail from "./ComposeEmail";

interface EmailTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSendEmail: () => void;
}

const EmailTabs = ({ activeTab, setActiveTab, onSendEmail }: EmailTabsProps) => {
  return (
    <Tabs defaultValue="inbox" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="inbox" className="flex items-center gap-2">
          <Inbox size={16} />
          <span className="hidden sm:inline">Inbox</span>
        </TabsTrigger>
        <TabsTrigger value="sent" className="flex items-center gap-2">
          <Send size={16} />
          <span className="hidden sm:inline">Sent</span>
        </TabsTrigger>
        <TabsTrigger value="starred" className="flex items-center gap-2">
          <Star size={16} />
          <span className="hidden sm:inline">Starred</span>
        </TabsTrigger>
        <TabsTrigger value="trash" className="flex items-center gap-2">
          <Trash size={16} />
          <span className="hidden sm:inline">Trash</span>
        </TabsTrigger>
        <TabsTrigger value="compose" className="flex items-center gap-2">
          <FileEdit size={16} />
          <span className="hidden sm:inline">Compose</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="inbox" className="space-y-4 mt-4">
        <EmailInbox />
      </TabsContent>
      
      <TabsContent value="sent" className="space-y-4 mt-4">
        <EmailSent />
      </TabsContent>
      
      <TabsContent value="starred" className="space-y-4 mt-4">
        <EmailStarred />
      </TabsContent>
      
      <TabsContent value="trash" className="space-y-4 mt-4">
        <EmailTrash />
      </TabsContent>
      
      <TabsContent value="compose" className="space-y-4 mt-4">
        <ComposeEmail onSendEmail={onSendEmail} onCancel={() => setActiveTab("inbox")} />
      </TabsContent>
    </Tabs>
  );
};

export default EmailTabs;
