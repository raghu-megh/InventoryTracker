import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch backend user data with restaurants when firebase user is available
  const { data: backendUser, isLoading: isBackendLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => apiRequest("/api/auth/user"),
    enabled: !!firebaseUser,
    retry: false,
  });

  const isLoading = isFirebaseLoading || (firebaseUser && isBackendLoading);
  const user = backendUser || firebaseUser;
  const isAuthenticated = !!firebaseUser;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
