
import { useState } from "react";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import GoogleAuthForm from "@/components/google/GoogleAuthForm";
import { Mail, FileEdit } from "lucide-react";
import EmailTabs from "@/components/email/EmailTabs";

const Email = () => {
  const { isAuthenticated } = useGoogleAuth();
  const [activeTab, setActiveTab] = useState("inbox");
  const { toast } = useToast();

  const handleNewEmail = () => {
    setActiveTab("compose");
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent",
      description: "Your email has been sent successfully.",
    });
    setActiveTab("inbox");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Email</h1>
      
      {!isAuthenticated ? (
        <GoogleAuthForm 
          serviceName="Gmail" 
          serviceIcon={<Mail className="h-5 w-5 text-clergy-primary" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleNewEmail}
            >
              <FileEdit size={16} />
              New Email
            </Button>
          </div>

          <EmailTabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onSendEmail={handleSendEmail} 
          />
        </div>
      )}
    </div>
  );
};

export default Email;
