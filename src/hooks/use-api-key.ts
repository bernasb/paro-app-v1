
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useApiKey(keyName: string) {
  const [apiKey, setApiKey] = useState<string>("");
  const { toast } = useToast();

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(keyName);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, [keyName]);

  const saveApiKey = (key: string) => {
    localStorage.setItem(keyName, key);
    setApiKey(key);
    toast({
      title: "API Key Saved",
      description: `Your ${keyName} has been saved to this browser`,
    });
  };

  const clearApiKey = () => {
    localStorage.removeItem(keyName);
    setApiKey("");
    toast({
      title: "API Key Removed",
      description: `Your ${keyName} has been removed from this browser`,
    });
  };

  return {
    apiKey,
    saveApiKey,
    clearApiKey
  };
}
