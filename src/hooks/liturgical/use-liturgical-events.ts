import { useState, useEffect } from "react";
import { LiturgicalEvent } from "@/types/liturgical";
import { getLiturgicalEvents } from "@/services/liturgical/liturgicalService";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";

export function useLiturgicalEvents() {
  const [events, setEvents] = useState<LiturgicalEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, loading: authLoading } = useGoogleAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingData(true);
      setError(null);
      try {
        // Use default value (7 days)
        const data = await getLiturgicalEvents();
        setEvents(data);
      } catch (err: unknown) {
        let errorMessage = "Failed to fetch liturgical events.";
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        console.error("Error fetching liturgical events:", err);
        setError(errorMessage);
        if (!errorMessage.includes("Authentication required")) {
            toast({
              title: "Error Fetching Events",
              description: errorMessage,
              variant: "destructive",
            });
        }
      } finally {
        setLoadingData(false);
      }
    };
    
    if (!authLoading) {
      if (isAuthenticated) {
        fetchEvents();
      } else {
        setError("Authentication required to view Liturgical Events.");
        setLoadingData(false);
        setEvents([]);
      }
    }

  }, [isAuthenticated, authLoading, toast]);

  const isLoading = authLoading || loadingData;

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      white: "bg-white text-black border border-gray-200",
      red: "bg-red-600 text-white",
      green: "bg-green-600 text-white",
      violet: "bg-violet-600 text-white",
      purple: "bg-violet-600 text-white",
      rose: "bg-pink-400 text-white",
      pink: "bg-pink-400 text-white",
      black: "bg-black text-white",
      gold: "bg-amber-400 text-black",
      blue: "bg-blue-600 text-white",
    };
    
    return colorMap[color.toLowerCase()] || "bg-gray-200 text-black";
  };

  return {
    events,
    isLoading,
    error,
    getColorClass
  };
}
