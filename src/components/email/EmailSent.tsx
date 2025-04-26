
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";

const EmailSent = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Sent</CardTitle>
        <CardDescription>Your sent emails will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-center py-8">
          <Send className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No sent emails yet</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailSent;
