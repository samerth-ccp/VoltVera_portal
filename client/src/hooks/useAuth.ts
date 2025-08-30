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
      await apiRequest('POST', '/api/logout');
      
      // Clear all cached data
      queryClient.clear();
      
      // Remove any stored credentials
      localStorage.removeItem('voltverashop_userId');
      localStorage.removeItem('voltverashop_remember_me');
      
      console.log('Logout successful, redirecting to login');
      // Navigate to login page
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if server logout fails, clear local data and redirect
      queryClient.clear();
      localStorage.removeItem('voltverashop_userId');
      localStorage.removeItem('voltverashop_remember_me');
      setLocation('/login');
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
