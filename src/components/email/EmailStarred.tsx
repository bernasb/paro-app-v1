
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

const EmailStarred = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Starred</CardTitle>
        <CardDescription>Your starred emails will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-center py-8">
          <Star className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No starred emails yet</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailStarred;
