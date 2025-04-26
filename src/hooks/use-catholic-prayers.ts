
import { useState, useEffect } from "react";
import { CatholicPrayer, MagisteriumMessage } from "@/utils/magisterium";
import { useToast } from "@/hooks/use-toast";
import { useMagisteriumApi } from "@/hooks/use-magisterium-api";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext"; // Import auth hook

export function useCatholicPrayers() {
  const [prayers, setPrayers] = useState<CatholicPrayer[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Renamed state
  const [error, setError] = useState<string | null>(null); // Add error state
  const { toast } = useToast();
  const { sendRequest } = useMagisteriumApi();
  const { isAuthenticated, loading: authLoading } = useGoogleAuth(); // Get auth state

  useEffect(() => {
    const fetchPrayers = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const messages: MagisteriumMessage[] = [
          {
            role: "system",
            content: "You are a Catholic prayer resource. Provide the text of common Catholic prayers in a structured format.",
          },
          {
            role: "user",
            content: `Provide the full text of these Catholic prayers: Apostle's Creed, Nicene Creed, St. Michael Prayer, The Way of the Cross, The Rosary, Stations of the Cross, Novena to the Sacred Heart of Jesus, Novena and Consecration to the Immaculate Heart of Mary, Novena to St. Joseph, The Angelus, Chaplet of Divine Mercy, The Regina Caeli. Format as JSON with an array of objects having title, content, and optionally description properties.`
          }
        ];

        // sendRequest now relies on proxyService which handles auth implicitly via Firebase SDK
        const data = await sendRequest<any>(messages);

        if (data && data.choices && data.choices[0]?.message?.content) {
          try {
            const content = data.choices[0].message.content;
            // Improved JSON extraction (handles potential code blocks) - Corrected Regex
            let jsonString = content;
            // Regex to find JSON within ```json ... ``` or ``` ... ``` blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1];
            }
            
            const prayerList = JSON.parse(jsonString);

            if (Array.isArray(prayerList)) {
              // Basic validation of prayer objects (optional but recommended)
              const validPrayers = prayerList.filter(p => p && typeof p.title === 'string' && typeof p.content === 'string');
              setPrayers(validPrayers);
              if (validPrayers.length !== prayerList.length) {
                  console.warn("Some prayer objects were invalid and filtered out.");
              }
            } else {
               throw new Error("Parsed content is not an array.");
            }
          } catch (parseError: unknown) {
            console.error("Error parsing prayers JSON:", parseError);
            let parseErrorMessage = (parseError instanceof Error) ? parseError.message : "Unknown parse error";
            setError(`Failed to parse prayer data: ${parseErrorMessage}`);
            setPrayers([]);
            toast({
                title: "Prayer Parsing Error",
                description: `Could not understand the prayer data received from the server. ${parseErrorMessage}`,
                variant: "destructive",
            });
          }
        } else {
            // Handle cases where AI response is missing expected structure
            setError("Received invalid response structure from AI.");
            setPrayers([]);
            console.error("Invalid AI response structure:", data);
            toast({
                title: "Prayer Loading Error",
                description: "Received an unexpected response format from the server.",
                variant: "destructive",
            });
        }
      } catch (err: unknown) {
        let errorMessage = "Failed to fetch Catholic prayers.";
        if (err instanceof Error) {
            errorMessage = err.message; // Use the specific error message
        }
        console.error("Error fetching Catholic prayers:", err);
        setError(errorMessage);
        // Don't show toast for auth errors
        if (!errorMessage.includes("Authentication required")) {
          toast({
            title: "Error Fetching Prayers",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setLoadingData(false);
      }
    };

    // Only fetch if auth check is done and user is authenticated
    if (!authLoading) {
      if (isAuthenticated) {
        fetchPrayers();
      } else {
        setError("Authentication required to view Catholic Prayers.");
        setLoadingData(false);
        setPrayers([]); // Clear prayers
      }
    }

  }, [isAuthenticated, authLoading, sendRequest, toast]); // Dependencies

  // Combine loading states
  const isLoading = authLoading || loadingData;

  return {
    prayers,
    isLoading,
    error, // Expose error state
  };
}
