import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale so updates trigger re-renders
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes but allow updates (TanStack Query v5)
  });



  const logout = async () => {
    try {
      console.log('Logout initiated');
      
      // Clear user data from cache immediately to trigger UI update
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // If impersonation token exists, revoke it server-side; DO NOT clear admin cookie session
      const token = sessionStorage.getItem('impersonationToken');
      if (token) {
        try {
          await fetch('/api/impersonation/revoke', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include',
          });
        } catch {}

        // Local cleanup and redirect for impersonated tab only
        localStorage.removeItem('voltverashop_userId');
        localStorage.removeItem('voltverashop_remember_me');
        sessionStorage.removeItem('impersonationToken');
        setLocation('/');
        return; // Do not call cookie-based logout (keeps admin tab logged in)
      }

      // Remove any stored credentials
      localStorage.removeItem('voltverashop_userId');
      localStorage.removeItem('voltverashop_remember_me');
      // Clear impersonation token if present
      sessionStorage.removeItem('impersonationToken');
      
      // Navigate to landing page immediately (user state is already cleared)
      setLocation('/');
      
      // Also call logout via cookie session to clear admin session if any
      await apiRequest('POST', '/api/logout');
      
      // Clear all cached data after logout
      queryClient.clear();
      
      console.log('Logout successful, redirecting to landing page');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if server logout fails, ensure user is logged out locally
      queryClient.setQueryData(["/api/auth/user"], null);
      localStorage.removeItem('voltverashop_userId');
      localStorage.removeItem('voltverashop_remember_me');
      setLocation('/');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
