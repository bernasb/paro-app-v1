
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, UserCircle } from "lucide-react"; // Use UserCircle or similar for icon
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

interface GoogleAuthFormProps {
  serviceName: string;
  serviceIcon: React.ReactNode;
  onSuccess?: () => void; // This might still be useful after successful sign-in
}

const GoogleAuthForm = ({ serviceName, serviceIcon, onSuccess }: GoogleAuthFormProps) => {
  // Get the updated context values
  const { user, isAuthenticated, signInWithGoogle, logout, loading, userEmail } = useGoogleAuth();

  const handleConnect = async () => {
    await signInWithGoogle(); 
    // onSuccess callback could be triggered here or based on user state change if needed
    if (user && onSuccess) {
        onSuccess();
    }
  };

  const handleDisconnect = async () => {
    await logout();
  };

  // Display loading skeleton while checking auth state initially
  if (loading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    );
  }

  // Display connected state
  if (isAuthenticated && user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {serviceIcon}
            Connected to {serviceName}
          </CardTitle>
          <CardDescription>
            Your account is connected via Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm flex items-center gap-2">
                <UserCircle size={18} />
                <span className="font-medium">{user.displayName || userEmail || 'N/A'}</span>
              </p>
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                className="gap-2"
                disabled={loading} // Disable button while logging out
              >
                <LogOut size={16} />
                {loading ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display disconnected state (Sign in button)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {serviceIcon}
          Connect to {serviceName}
        </CardTitle>
        <CardDescription>
          Sign in with your Google account to access {serviceName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          className="w-full bg-clergy-primary hover:bg-clergy-primary/90 mt-4"
          onClick={handleConnect}
          disabled={loading} // Disable button while signing in
        >
          {loading ? "Connecting..." : `Sign in with Google`}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
            You will be prompted to sign in via a Google popup.
        </p>
      </CardContent>
    </Card>
  );
};

export default GoogleAuthForm;
