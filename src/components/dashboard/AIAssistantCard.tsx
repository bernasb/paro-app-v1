
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

// Mock data for AI suggestions
const aiSuggestions = [
  "Prepare sermon outline for Sunday",
  "Draft email to Parish Council",
  "Find prayers for healing service",
  "Explain Church teaching on social justice",
];

export function AIAssistantCard() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-clergy-primary" />
          Magisterium AI Assistant
        </CardTitle>
        <CardDescription>Catholic theological guidance and assistance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          {aiSuggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className={`justify-start text-left h-auto py-2 ${
                activeIndex === index ? "border-clergy-primary" : ""
              }`}
              onClick={() => setActiveIndex(index)}
            >
              <span>{suggestion}</span>
            </Button>
          ))}
        </div>

        <div className="pt-2">
          <Link to="/ai-assistant" className="w-full block">
            <Button 
              className="w-full gap-2 bg-clergy-primary hover:bg-clergy-primary/90"
            >
              <Mic className="h-4 w-4" />
              Open Magisterium AI Assistant
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
