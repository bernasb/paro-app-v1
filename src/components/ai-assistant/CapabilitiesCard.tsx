
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const CapabilitiesCard = () => {
  const capabilities = [
    {
      title: "Catholic Theological Q&A",
      description: "Get answers to theological questions with citations from Catholic Church documents.",
    },
    {
      title: "Sermon Preparation",
      description: "Get help with sermon outlines, themes, and relevant scripture references.",
    },
    {
      title: "Catholic Teaching Guidance",
      description: "Learn about Church positions on ethical and moral questions with authoritative sources.",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Magisterium AI Capabilities</CardTitle>
        <CardDescription>What the Magisterium AI assistant can help you with</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {capabilities.map((capability, index) => (
            <div key={index} className="p-4 bg-accent/20 rounded-lg">
              <h3 className="font-medium text-foreground mb-1">{capability.title}</h3>
              <p className="text-sm text-muted-foreground">{capability.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <a 
          href="https://www.magisterium.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-clergy-primary hover:underline flex items-center gap-1"
        >
          Learn more about Magisterium AI
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  );
};
