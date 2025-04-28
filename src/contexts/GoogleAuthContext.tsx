import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider as FirebaseGoogleProvider, // Rename to avoid conflict
  User,
} from 'firebase/auth';
import { auth } from '@/integrations/firebase/client'; // Import initialized auth
import { useToast } from '@/hooks/use-toast';

interface GoogleAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean; // Add loading state
  userEmail: string | null; // Keep for compatibility if needed, derived from user
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const GoogleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start loading until auth state is checked
  const { toast } = useToast();

  useEffect(() => {
    // Listener for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Auth state determined, stop loading
      if (currentUser) {
        console.log('Firebase User signed in:', currentUser.email);
        // You might still store something simple in localStorage if needed elsewhere,
        // but Firebase SDK manages the actual session.
        // localStorage.setItem("googleAuthUser", currentUser.email || '');
      } else {
        console.log('Firebase User signed out');
        // localStorage.removeItem("googleAuthUser");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    const provider = new FirebaseGoogleProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // This user is also set by the onAuthStateChanged listener,
      // but setting it here can make the UI update slightly faster.
      toast({
        title: 'Google Account Connected',
        description: `Successfully signed in as ${result.user.email}`,
      });
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      toast({
        title: 'Sign-In Failed',
        description: error.message || 'Could not sign in with Google.',
        variant: 'destructive',
      });
    } finally {
      // setLoading(false); // onAuthStateChanged will handle this
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await signOut(auth);
      // User state will be updated by onAuthStateChanged listener
      toast({
        title: 'Disconnected',
        description: 'Google account signed out successfully',
      });
    } catch (error: any) {
      console.error('Sign Out Error:', error);
      toast({
        title: 'Sign Out Failed',
        description: error.message || 'Could not sign out.',
        variant: 'destructive',
      });
    } finally {
      // setLoading(false); // onAuthStateChanged will handle this
    }
  };

  // Derive convenience values from the user state
  const isAuthenticated = !!user && !loading;
  const userEmail = user?.email || null;

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        signInWithGoogle, // Use the new function name
        logout,
        loading,
        userEmail,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = (): GoogleAuthContextType => {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};
