
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash } from "lucide-react";

const EmailTrash = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Trash</CardTitle>
        <CardDescription>Your deleted emails will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-center py-8">
          <Trash className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Trash is empty</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTrash;
