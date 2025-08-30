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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = async () => {
    try {
      console.log('Logout initiated');
      
      // Clear user data from cache immediately to trigger UI update
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Remove any stored credentials
      localStorage.removeItem('voltverashop_userId');
      localStorage.removeItem('voltverashop_remember_me');
      
      // Navigate to landing page immediately (user state is already cleared)
      setLocation('/');
      
      // Call logout API in background
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
