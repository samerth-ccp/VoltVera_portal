import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Crown, Clock, Plus, Menu, X, Settings, Lock, BarChart3, FileText, Shield, DollarSign, Award, Search, Filter, ChevronDown, ChevronRight, Wallet, TrendingUp, Activity, Mail, RefreshCw, CheckCircle, XCircle, Link2, Copy, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User, CreateUser } from "@shared/schema";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import DataTable from "@/components/ui/data-table";
import UserManagementTable from "@/components/UserManagementTable";
import FreeUsersTable from "@/components/FreeUsersTable";
import { AdminPendingRecruits } from "@/components/AdminPendingRecruits";
import AdminPendingUsers from "@/components/AdminPendingUsers";
import UserManagement from "@/components/UserManagement";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AdminReferralLinkGeneration } from "@/components/AdminStrategicUserCreation";
import { PendingKYCSection, ApprovedKYCSection, RejectedKYCSection } from "@/components/AdminKYCSections";
import WithdrawPersonallyForm from "@/components/WithdrawPersonallyForm";
import SendFundForm from "@/components/SendFundForm";
import FundHistoryTable from "@/components/FundHistoryTable";
import FundRequestsTable from "@/components/PendingFundRequestsTable";
import WithdrawalHistoryTable from "@/components/WithdrawalHistoryTable";
import { IncomeReportsTable } from "@/components/IncomeReportsTable";
import { BVTransactionsReport } from "@/components/BVTransactionsReport";
import { MonthlyBVReport } from "@/components/MonthlyBVReport";
import { UserPerformanceReport } from "@/components/UserPerformanceReport";
import AdminProductManagement from "@/components/AdminProductManagement";
import AdminPurchasesTable from "@/components/AdminPurchasesTable";
import AdminCouponManagement from "@/components/AdminCouponManagement";
import AdminDailyReport from "@/components/AdminDailyReport";
import BroadcastNotification from "@/components/BroadcastNotification";
import { ReportsGuide } from "@/components/ReportsGuide";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  pendingUsers: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingKYC: number;
  withdrawalRequests: number;
  franchiseRequests: number;
  totalPurchases: number;
  totalBV: string;
  monthlyIncome: string;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  usePageTitle("Admin Dashboard", "VoltveraShop admin control panel");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [reportsGuideOpen, setReportsGuideOpen] = useState(false);
  
  // Withdrawal management state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['main']);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Keyboard shortcut for refresh when on various sections
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((activeSection === 'today-joinings' || activeSection === 'paid-members' || activeSection === 'free-users' || 
           activeSection === 'pending-withdraw' || activeSection === 'approved-withdraw' || activeSection === 'rejected-withdraw' || 
           activeSection === 'withdraw-personally' || activeSection === 'income-history-withdraw' || activeSection === 'send-fund' || activeSection === 'fund-history' || 
           activeSection === 'pending-fund-requests' || activeSection === 'approved-fund-requests' || activeSection === 'rejected-fund-requests') && 
          (event.key === 'F5' || (event.ctrlKey && event.key === 'r'))) {
        event.preventDefault();
        if (activeSection === 'today-joinings') {
          // Invalidate and refetch today's joinings
          queryClient.invalidateQueries({ queryKey: ["/api/users/today-joinings"] });
          toast({
            title: "Refreshed",
            description: "Today's activations data has been updated.",
          });
        } else if (activeSection === 'paid-members') {
          // Invalidate and refetch paid members
          queryClient.invalidateQueries({ queryKey: ["/api/users/paid-members"] });
          toast({
            title: "Refreshed",
            description: "Paid members data has been updated.",
          });
        } else if (activeSection === 'free-users') {
          // Invalidate and refetch free users
          queryClient.invalidateQueries({ queryKey: ["/api/users/free-users"] });
          toast({
            title: "Refreshed",
            description: "Free users data has been updated.",
          });
        } else if (activeSection === 'pending-withdraw') {
          // Invalidate and refetch pending withdrawals
          queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-withdrawals"] });
          toast({
            title: "Refreshed",
            description: "Pending withdrawals data has been updated.",
          });
        } else if (activeSection === 'approved-withdraw') {
          // Invalidate and refetch approved withdrawals
          queryClient.invalidateQueries({ queryKey: ["/api/admin/approved-withdrawals"] });
          toast({
            title: "Refreshed",
            description: "Approved withdrawals data has been updated.",
          });
        } else if (activeSection === 'rejected-withdraw') {
          // Invalidate and refetch rejected withdrawals
          queryClient.invalidateQueries({ queryKey: ["/api/admin/rejected-withdrawals"] });
          toast({
            title: "Refreshed",
            description: "Rejected withdrawals data has been updated.",
          });
        } else if (activeSection === 'withdraw-personally') {
          // Refresh admin withdrawal form (no specific data to refresh, just show toast)
          toast({
            title: "Refreshed",
            description: "Admin withdrawal form refreshed.",
          });
        } else if (activeSection === 'income-history-withdraw') {
          // Invalidate and refetch income history
          queryClient.invalidateQueries({ queryKey: ["/api/admin/income-transactions"] });
          toast({
            title: "Refreshed",
            description: "Income history data has been updated.",
          });
        } else if (activeSection === 'send-fund') {
          // Refresh send fund form (no specific data to refresh, just show toast)
          toast({
            title: "Refreshed",
            description: "Send fund form refreshed.",
          });
        } else if (activeSection === 'fund-history') {
          // Invalidate and refetch fund history
          queryClient.invalidateQueries({ queryKey: ["/api/admin/fund-history"] });
          toast({
            title: "Refreshed",
            description: "Fund history data has been updated.",
          });
        } else if (activeSection === 'pending-fund-requests') {
          // Invalidate and refetch pending fund requests
          queryClient.invalidateQueries({ queryKey: ["/api/admin/fund-requests"] });
          toast({
            title: "Refreshed",
            description: "Pending fund requests data has been updated.",
          });
        } else if (activeSection === 'approved-fund-requests') {
          // Invalidate and refetch approved fund requests
          queryClient.invalidateQueries({ queryKey: ["/api/admin/fund-requests"] });
          toast({
            title: "Refreshed",
            description: "Approved fund requests data has been updated.",
          });
        } else if (activeSection === 'rejected-fund-requests') {
          // Invalidate and refetch rejected fund requests
          queryClient.invalidateQueries({ queryKey: ["/api/admin/fund-requests"] });
          toast({
            title: "Refreshed",
            description: "Rejected fund requests data has been updated.",
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, queryClient, toast]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Fetch users with simplified search
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users/search", searchQuery, statusFilter, roleFilter, kycFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      if (kycFilter && kycFilter !== 'all') params.append('kycStatus', kycFilter);
      
      const response = await fetch(`/api/admin/users/search?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch wallet data for all users
  const { data: walletBalances = [] } = useQuery({
    queryKey: ["/api/admin/wallet-balances"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/wallet-balances');
      return await response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch today's joinings with timezone detection
  const { data: todayJoinings = [], isLoading: todayJoiningsLoading, refetch: refetchTodayJoinings } = useQuery<User[]>({
    queryKey: ["/api/users/today-joinings", new Date().toDateString()], // Add date to force cache refresh
    queryFn: async () => {
      // Detect user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const timestamp = Date.now();
      const response = await fetch(`/api/users/today-joinings?timezone=${encodeURIComponent(userTimezone)}&t=${timestamp}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch today\'s joinings');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache (gcTime is the new name for cacheTime in newer versions)
  });

  // Fetch paid members
  const { data: paidMembers = [], isLoading: paidMembersLoading, refetch: refetchPaidMembers } = useQuery<User[]>({
    queryKey: ["/api/users/paid-members"],
    queryFn: async () => {
      const response = await fetch('/api/users/paid-members', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch paid members');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch free users
  const { data: freeUsers = [], isLoading: freeUsersLoading, refetch: refetchFreeUsers } = useQuery<User[]>({
    queryKey: ["/api/users/free-users"],
    queryFn: async () => {
      const response = await fetch('/api/users/free-users', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch free users');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Handle refresh for today's joinings
  const handleRefreshTodayJoinings = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/users/today-joinings"] });
      await refetchTodayJoinings();
      toast({
        title: "Refreshed",
        description: "Today's activations data has been updated.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle refresh for paid members
  const handleRefreshPaidMembers = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/users/paid-members"] });
      await refetchPaidMembers();
      toast({
        title: "Refreshed",
        description: "Paid members data has been updated.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle refresh for free users
  const handleRefreshFreeUsers = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/users/free-users"] });
      await refetchFreeUsers();
      toast({
        title: "Refreshed",
        description: "Free users data has been updated.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch withdrawal data for all users
  const { data: withdrawalRequests = [] } = useQuery({
    queryKey: ["/api/admin/withdrawals"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/withdrawals');
      return await response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch pending withdrawal requests with user details
  const { data: pendingWithdrawals = [], isLoading: pendingWithdrawalsLoading, refetch: refetchPendingWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/pending-withdrawals"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/pending-withdrawals');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch approved withdrawal requests with user details
  const { data: approvedWithdrawals = [], isLoading: approvedWithdrawalsLoading, refetch: refetchApprovedWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/approved-withdrawals"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/approved-withdrawals');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch rejected withdrawal requests with user details
  const { data: rejectedWithdrawals = [], isLoading: rejectedWithdrawalsLoading, refetch: refetchRejectedWithdrawals } = useQuery<any[]>({
    queryKey: ["/api/admin/rejected-withdrawals"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/rejected-withdrawals');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Create data maps for efficient lookup
  const walletDataMap = Array.isArray(walletBalances) ? walletBalances.reduce((acc: any, wallet: any) => {
    acc[wallet.userId] = {
      balance: wallet.balance,
      totalEarnings: wallet.totalEarnings,
      totalWithdrawals: wallet.totalWithdrawals,
    };
    return acc;
  }, {}) : {};

  const withdrawalDataMap = Array.isArray(withdrawalRequests) ? withdrawalRequests.reduce((acc: any, withdrawal: any) => {
    acc[withdrawal.userId] = {
      status: withdrawal.status,
    };
    return acc;
  }, {}) : {};

  // Fetch enhanced admin stats
  const { data: adminStats, isLoading: isLoadingAdminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === 'admin',
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Data considered fresh for 10 seconds
  });

  // Keep legacy stats for compatibility
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });

      toast({
        title: "Signup email sent",
        description: "Invitation email has been sent to the user",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<User> }) => {
      const response = await apiRequest('PATCH', `/api/users/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  // Approve withdrawal mutation
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const response = await apiRequest('POST', `/api/admin/approve-withdrawal/${withdrawalId}`, {
        adminNotes: 'Approved by admin'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({
        title: "Success",
        description: "Withdrawal request approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve withdrawal request",
        variant: "destructive",
      });
    }
  });

  // Reject withdrawal mutation
  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ withdrawalId, reason }: { withdrawalId: string, reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/reject-withdrawal/${withdrawalId}`, {
        reason
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedWithdrawalId(null);
      toast({
        title: "Success",
        description: "Withdrawal request rejected successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject withdrawal request",
        variant: "destructive",
      });
    }
  });

  // Reactivate withdrawal mutation
  const reactivateWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/admin/reactivate-withdrawal/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rejected-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-withdrawals"] });
      toast({
        title: "Success",
        description: "Withdrawal request reactivated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate withdrawal request",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const fullName = formData.get('fullName') as string;
    const userData = {
      fullName: fullName,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as 'admin' | 'user',
    };

    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const updates = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as 'admin' | 'user',
      status: formData.get('status') as 'active' | 'inactive' | 'pending',
    };

    updateUserMutation.mutate({ id: editingUser.id, updates });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Withdrawal handlers
  const handleApproveWithdrawal = (withdrawalId: string) => {
    if (confirm('Are you sure you want to approve this withdrawal request?')) {
      approveWithdrawalMutation.mutate(withdrawalId);
    }
  };

  const handleRejectWithdrawal = (withdrawalId: string) => {
    setSelectedWithdrawalId(withdrawalId);
    setRejectDialogOpen(true);
  };

  const handleSubmitRejection = () => {
    if (!selectedWithdrawalId || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    rejectWithdrawalMutation.mutate({
      withdrawalId: selectedWithdrawalId,
      reason: rejectionReason.trim()
    });
  };

  const handleCancelRejection = () => {
    setRejectDialogOpen(false);
    setRejectionReason('');
    setSelectedWithdrawalId(null);
  };

  const handleReactivateWithdrawal = (id: string) => {
    reactivateWithdrawalMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <VoltverashopLogo />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar with Voltvera Theme */}
      <div className={`fixed inset-y-0 left-0 w-72 volt-gradient text-white z-30 transform transition-transform lg:translate-x-0 overflow-y-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 border-b border-white/20 px-4">
          <div className="flex items-center">
            <VoltverashopLogo size="small" />
            <div className="ml-3">
              <div className="text-lg font-bold">Voltverashop</div>
              <div className="text-xs text-white/70">Admin Portal</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          {/* Main Dashboard */}
          <button 
            onClick={() => setActiveSection('dashboard')}
            className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${
              activeSection === 'dashboard' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/90'
            }`}
          >
            <BarChart3 className="mr-3 h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          {/* User Details Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleMenu('users')}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors group text-white/90"
            >
              <Users className="mr-3 h-5 w-5" />
              <span className="font-medium flex-1">User Details</span>
              {expandedMenus.includes('users') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
            {expandedMenus.includes('users') && (
              <div className="ml-8 space-y-1">
                <button 
                  onClick={() => setActiveSection('all-members')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'all-members' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  All Members
                </button>
                <button 
                  onClick={() => setActiveSection('paid-members')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'paid-members' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Paid Members
                </button>
                <button 
                  onClick={() => setActiveSection('today-joinings')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'today-joinings' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  View Today Joinings
                </button>
                <button 
                  onClick={() => setActiveSection('free-users')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'free-users' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Free Users
                </button>
              </div>
            )}
          </div>


          {/* Income Reports Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleMenu('income')}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors group text-white/90"
            >
              <TrendingUp className="mr-3 h-5 w-5" />
              <span className="font-medium flex-1">Income Reports</span>
              {expandedMenus.includes('income') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
            {expandedMenus.includes('income') && (
              <div className="ml-8 space-y-1">
                <button 
                  onClick={() => setActiveSection('user-performance-report')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'user-performance-report' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                  data-testid="menu-user-performance-report"
                >
                  User Performance Report
                </button>
                <button 
                  onClick={() => setActiveSection('income-history')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'income-history' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                  data-testid="menu-income-history"
                >
                  Income History
                </button>
                {/* Hidden: Direct Income (Oct 17, 2025) - Redundant with BV Transactions Report
                <button 
                  onClick={() => setActiveSection('direct-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'direct-income' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Direct Income
                </button>
                */}
                {/* Hidden: ROI Income
                <button 
                  onClick={() => setActiveSection('roi-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'roi-income' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  ROI Income
                </button>
                */}
                {/* Hidden: Salary Income
                <button 
                  onClick={() => setActiveSection('salary-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'salary-income' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Salary Income
                </button>
                */}
                {/* Hidden: Payout Summary
                <button 
                  onClick={() => setActiveSection('payout-summary')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'payout-summary' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Payout Summary
                </button>
                */}
                {/* Hidden: Holiday Reward Summary
                <button 
                  onClick={() => setActiveSection('holiday-reward')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'holiday-reward' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Holiday Reward Summary
                </button>
                */}
                <button 
                  onClick={() => setActiveSection('bv-transactions-report')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'bv-transactions-report' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                  data-testid="menu-bv-transactions-report"
                >
                  BV Transactions Report
                </button>
                <button 
                  onClick={() => setActiveSection('monthly-bv-report')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'monthly-bv-report' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                  data-testid="menu-monthly-bv-report"
                >
                  Monthly BV Report
                </button>
              </div>
            )}
          </div>

          {/* KYC Details Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleMenu('kyc')}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors group text-white/90"
            >
              <Shield className="mr-3 h-5 w-5" />
              <span className="font-medium flex-1">KYC Details</span>
              {expandedMenus.includes('kyc') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
            {expandedMenus.includes('kyc') && (
              <div className="ml-8 space-y-1">
                <button 
                  onClick={() => setActiveSection('pending-kyc')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'pending-kyc' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Pending KYC Requests
                </button>
                <button 
                  onClick={() => setActiveSection('approved-kyc')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'approved-kyc' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Approved KYC Requests
                </button>
                <button 
                  onClick={() => setActiveSection('rejected-kyc')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'rejected-kyc' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Rejected KYC Requests
                </button>
              </div>
            )}
          </div>

          {/* Product Management */}
          <button 
            onClick={() => setActiveSection('product-management')}
            className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${
              activeSection === 'product-management' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/90'
            }`}
            data-testid="menu-product-management"
          >
            <Package className="mr-3 h-5 w-5" />
            <span className="font-medium">Product Management</span>
          </button>

          {/* Coupon Management */}
          <button 
            onClick={() => setActiveSection('coupon-management')}
            className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${
              activeSection === 'coupon-management' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/90'
            }`}
            data-testid="menu-coupon-management"
          >
            <Award className="mr-3 h-5 w-5" />
            <span className="font-medium">Coupon Management</span>
          </button>

          {/* Purchases Tracking */}
          <button 
            onClick={() => setActiveSection('purchases')}
            className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${
              activeSection === 'purchases' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/90'
            }`}
            data-testid="menu-purchases"
          >
            <TrendingUp className="mr-3 h-5 w-5" />
            <span className="font-medium">All Purchases</span>
          </button>

          {/* Daily Order Report */}
          <button 
            onClick={() => setActiveSection('daily-report')}
            className={`flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors ${
              activeSection === 'daily-report' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/90'
            }`}
            data-testid="menu-daily-report"
          >
            <BarChart3 className="mr-3 h-5 w-5" />
            <span className="font-medium">Daily Order Report</span>
          </button>

          {/* Withdraw Management Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleMenu('withdraw')}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors group text-white/90"
            >
              <DollarSign className="mr-3 h-5 w-5" />
              <span className="font-medium flex-1">Withdraw Management</span>
              {expandedMenus.includes('withdraw') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
            {expandedMenus.includes('withdraw') && (
              <div className="ml-8 space-y-1">
                <button 
                  onClick={() => setActiveSection('pending-withdraw')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'pending-withdraw' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Pending Withdraw Requests
                </button>
                <button 
                  onClick={() => setActiveSection('approved-withdraw')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'approved-withdraw' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Approved Withdraw Requests
                </button>
                <button 
                  onClick={() => setActiveSection('rejected-withdraw')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'rejected-withdraw' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Rejected Withdraw Requests
                </button>
                <button 
                  onClick={() => setActiveSection('withdraw-personally')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'withdraw-personally' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Admin Withdrawal
                </button>
                <button 
                  onClick={() => setActiveSection('withdrawal-history')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'withdrawal-history' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                  data-testid="menu-withdrawal-history"
                >
                  Withdrawal History
                </button>
              </div>
            )}
          </div>

          {/* Fund Management Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleMenu('fund')}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors group text-white/90"
            >
              <Wallet className="mr-3 h-5 w-5" />
              <span className="font-medium flex-1">Fund Management</span>
              {expandedMenus.includes('fund') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
            {expandedMenus.includes('fund') && (
              <div className="ml-8 space-y-1">
                <button 
                  onClick={() => setActiveSection('send-fund')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'send-fund' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Send Fund
                </button>
                <button 
                  onClick={() => setActiveSection('fund-history')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'fund-history' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Fund History
                </button>
                <button 
                  onClick={() => setActiveSection('pending-fund-requests')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'pending-fund-requests' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Pending Fund Requests
                </button>
                <button 
                  onClick={() => setActiveSection('approved-fund-requests')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'approved-fund-requests' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Approved Fund Requests
                </button>
                <button 
                  onClick={() => setActiveSection('rejected-fund-requests')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'rejected-fund-requests' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Rejected Fund Requests
                </button>
                {/* Manage Fund button hidden per request */}
                {/* 
                <button 
                  onClick={() => setActiveSection('manage-fund')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'manage-fund' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Manage Fund
                </button>
                */}
              </div>
            )}
          </div>

          <div className="border-t border-white/20 pt-4 mt-6">
            <Link href="/change-password">
              <button className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 text-white/90">
                <Lock className="mr-3 h-5 w-5" />
                <span className="font-medium">Change Password</span>
              </button>
            </Link>
            <button 
              onClick={() => {
                fetch('/api/logout', { method: 'POST', credentials: 'include' })
                  .then(() => window.location.href = '/');
              }}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 text-white/90"
            >
              <span className="mr-3">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Enhanced Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-4 text-gray-600 hover:bg-gray-100"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {activeSection === 'dashboard' && 'Admin Dashboard'}
                  {activeSection.includes('members') && 'User Management'}
                  {activeSection.includes('kyc') && 'KYC Management'}
                  {activeSection.includes('withdraw') && 'Withdrawal Management'}
                  {activeSection.includes('income') && 'Income Reports'}
                  {activeSection.includes('fund') && 'Fund Management'}
                  {(activeSection === 'users' || activeSection === 'kyc' || activeSection === 'withdrawals' || activeSection === 'reports' || activeSection === 'franchise') && 'Legacy Section'}
                </h1>
                <p className="text-gray-600 text-sm hidden sm:block">
                  {activeSection === 'dashboard' && 'Monitor income stats, active users, and system performance'}
                  {activeSection.includes('members') && 'Manage portal users and their access levels'}
                  {activeSection.includes('kyc') && 'Review and approve KYC documents'}
                  {activeSection.includes('withdraw') && 'Process withdrawal requests and approvals'}
                  {activeSection.includes('income') && 'View detailed income reports by category'}
                  {activeSection.includes('fund') && 'Manage fund transfers and wallet operations'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReportsGuideOpen(true)}
                      className="text-gray-600 hover:text-gray-900"
                      data-testid="button-reports-guide"
                    >
                      <FileText className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reports Guide - Learn about all reports</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <BroadcastNotification />
              <NotificationCenter />
                                {/* Add User functionality now handled by AdminReferralLinkGeneration component */}

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-volt-light rounded-full flex items-center justify-center text-white font-medium text-sm">
                  A
                </div>
                <span className="text-gray-700 font-medium">{user.firstName} {user.lastName}</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Enhanced Dashboard Content */}
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
          {activeSection === 'dashboard' && (
            <>
              {/* Enhanced Dashboard Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-volt-light" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800">{adminStats?.totalUsers || 0}</div>
                    <p className="text-xs text-gray-500">All registered members</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800">{adminStats?.activeUsers || 0}</div>
                    <p className="text-xs text-gray-500">Currently active members</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Pending KYC</CardTitle>
                    <Shield className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800">{adminStats?.pendingKYC || 0}</div>
                    <p className="text-xs text-gray-500">Documents awaiting review</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Withdrawal Requests</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800">{adminStats?.withdrawalRequests || 0}</div>
                    <p className="text-xs text-gray-500">Pending approval</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5 text-volt-light" />
                      Total Business Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-volt-light">₹{adminStats?.totalBV || '0.00'}</div>
                    <p className="text-sm text-gray-500 mt-2">Cumulative system BV</p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                      Monthly Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-600">₹{adminStats?.monthlyIncome || '0.00'}</div>
                    <p className="text-sm text-gray-500 mt-2">System income this month</p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow" onClick={() => setActiveSection('purchases')} style={{ cursor: 'pointer' }}>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                      <Package className="mr-2 h-5 w-5 text-blue-600" />
                      Total Purchases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-600" data-testid="total-purchases-stat">{adminStats?.totalPurchases || 0}</div>
                    <p className="text-sm text-gray-500 mt-2">All product orders</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Activity - Hidden as per user request (Oct 17, 2025) */}
              {/* {((adminStats?.pendingKYC || 0) > 0 || (adminStats?.withdrawalRequests || 0) > 0 || (adminStats?.franchiseRequests || 0) > 0) && (
                <Card className="mb-6 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-volt-light" />
                      Admin Actions Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {adminStats && adminStats.pendingKYC > 0 && (
                        <button
                          onClick={() => setActiveSection('pending-kyc')}
                          className="w-full flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400 hover:bg-yellow-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-yellow-600" />
                            <div className="text-left">
                              <p className="font-medium">Pending KYC Documents</p>
                              <p className="text-sm text-gray-600">{adminStats.pendingKYC} document{adminStats.pendingKYC !== 1 ? 's' : ''} awaiting review</p>
                            </div>
                          </div>
                          <span className="px-4 py-2 text-sm font-medium rounded-md volt-gradient text-white border border-gray-300">Review</span>
                        </button>
                      )}
                      
                      {adminStats && adminStats.withdrawalRequests > 0 && (
                        <button
                          onClick={() => setActiveSection('pending-withdraw')}
                          className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400 hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                            <div className="text-left">
                              <p className="font-medium">Pending Withdrawals</p>
                              <p className="text-sm text-gray-600">{adminStats.withdrawalRequests} withdrawal request{adminStats.withdrawalRequests !== 1 ? 's' : ''} pending</p>
                            </div>
                          </div>
                          <span className="px-4 py-2 text-sm font-medium rounded-md volt-gradient text-white border border-gray-300">Review</span>
                        </button>
                      )}
                      
                      {adminStats && adminStats.franchiseRequests > 0 && (
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                          <div className="flex items-center gap-3">
                            <Award className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium">Franchise Applications</p>
                              <p className="text-sm text-gray-600">{adminStats.franchiseRequests} application{adminStats.franchiseRequests !== 1 ? 's' : ''} under review</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )} */}
            </>
          )}
          
          {activeSection === 'all-members' && (
            <div className="space-y-6">
              {/* Pending Recruits Section - Hidden as per user request (Oct 17, 2025) */}
              {/* <AdminPendingRecruits /> */}
              
              {/* Strategic User Creation Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-800">Referral Link Generation</h3>
                  <AdminReferralLinkGeneration />
                </div>
                <p className="text-gray-600 text-sm">
                  Generate referral links for strategic user placement in the MLM tree. Users register through links and get placed under selected parents.
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-6">All Members Management</h3>
                {/* Simplified User Search */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <h4 className="text-md font-medium text-gray-800 mb-4">Search & Filter Users</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="lg:col-span-2">
                    <Label htmlFor="searchQuery">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="searchQuery"
                        placeholder="Search by User ID, Name, or Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-users"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="statusFilter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="roleFilter">Role</Label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger data-testid="select-role-filter">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="founder">Founder</SelectItem>
                        <SelectItem value="mini_franchise">Mini Franchise</SelectItem>
                        <SelectItem value="basic_franchise">Basic Franchise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="kycFilter">KYC Status</Label>
                    <Select value={kycFilter} onValueChange={setKycFilter}>
                      <SelectTrigger data-testid="select-kyc-filter">
                        <SelectValue placeholder="All KYC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All KYC</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <p className="text-sm text-gray-600">
                      Found {users.length} user{users.length !== 1 ? 's' : ''}
                      {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setRoleFilter('all');
                        setKycFilter('all');
                      }}
                      data-testid="button-clear-filters"
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Complete User Management Table */}
              <UserManagementTable 
                users={users as any}
                walletData={walletDataMap}
                withdrawalData={withdrawalDataMap}
              />
              </div>
            </div>
          )}


          {/* Withdrawal Management Sections */}
          {activeSection === 'pending-withdraw' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-volt-light" />
                  Pending Withdrawal Requests
                </CardTitle>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {pendingWithdrawalsLoading ? 'Loading...' : `${pendingWithdrawals.length} pending requests`}
                  </p>
                  <Button
                    onClick={() => refetchPendingWithdrawals()}
                    size="sm"
                    variant="outline"
                    disabled={pendingWithdrawalsLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${pendingWithdrawalsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingWithdrawalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-volt-light"></div>
                    <span className="ml-2 text-gray-600">Loading pending withdrawals...</span>
                  </div>
                ) : pendingWithdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending withdrawals</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no pending withdrawal requests at the moment.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-gray-700">User</th>
                          <th className="text-left p-3 font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                          <th className="text-left p-3 font-medium text-gray-700">Details</th>
                          <th className="text-left p-3 font-medium text-gray-700">Date</th>
                          <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingWithdrawals.map((withdrawal: any) => (
                          <tr key={withdrawal.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{withdrawal.userName}</p>
                                <p className="text-sm text-gray-500">{withdrawal.userEmail}</p>
                                <p className="text-xs text-gray-400">ID: {withdrawal.userDisplayId}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                withdrawal.type === 'Bank Transfer' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {withdrawal.type}
                              </span>
                            </td>
                            <td className="p-3 font-medium">
                              ₹{withdrawal.amount.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                <p className="text-gray-900">{withdrawal.details}</p>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-500">
                              {new Date(withdrawal.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  className="volt-gradient text-white"
                                  onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                  disabled={approveWithdrawalMutation.isPending}
                                >
                                  {approveWithdrawalMutation.isPending ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleRejectWithdrawal(withdrawal.id)}
                                  disabled={rejectWithdrawalMutation.isPending}
                                >
                                  {rejectWithdrawalMutation.isPending ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === 'approved-withdraw' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Approved Withdrawal Requests
                </CardTitle>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {approvedWithdrawalsLoading ? 'Loading...' : `${approvedWithdrawals.length} approved requests`}
                  </p>
                  <Button
                    onClick={() => refetchApprovedWithdrawals()}
                    size="sm"
                    variant="outline"
                    disabled={approvedWithdrawalsLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${approvedWithdrawalsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {approvedWithdrawalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="ml-2 text-gray-600">Loading approved withdrawals...</span>
                  </div>
                ) : approvedWithdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No approved withdrawals</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no approved withdrawal requests at the moment.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-gray-700">User</th>
                          <th className="text-left p-3 font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                          <th className="text-left p-3 font-medium text-gray-700">Details</th>
                          <th className="text-left p-3 font-medium text-gray-700">Approved Date</th>
                          <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedWithdrawals.map((withdrawal: any) => (
                          <tr key={withdrawal.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{withdrawal.userName}</p>
                                <p className="text-sm text-gray-500">{withdrawal.userEmail}</p>
                                <p className="text-xs text-gray-400">ID: {withdrawal.userDisplayId}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                withdrawal.type === 'Bank Transfer' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {withdrawal.type}
                              </span>
                            </td>
                            <td className="p-3 font-medium">
                              ₹{withdrawal.amount.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                <p className="text-gray-900">{withdrawal.details}</p>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-gray-500">
                              {new Date(withdrawal.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled
                                >
                                  Actions
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === 'rejected-withdraw' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <XCircle className="mr-2 h-5 w-5 text-red-600" />
                  Rejected Withdrawal Requests
                </CardTitle>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {rejectedWithdrawalsLoading ? 'Loading...' : `${rejectedWithdrawals.length} rejected requests`}
                  </p>
                  <Button
                    onClick={() => refetchRejectedWithdrawals()}
                    size="sm"
                    variant="outline"
                    disabled={rejectedWithdrawalsLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${rejectedWithdrawalsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {rejectedWithdrawalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-gray-600">Loading rejected withdrawals...</span>
                  </div>
                ) : rejectedWithdrawals.length === 0 ? (
                  <div className="text-center py-8">
                    <XCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected withdrawals</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no rejected withdrawal requests at the moment.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-gray-700">User</th>
                          <th className="text-left p-3 font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                          <th className="text-left p-3 font-medium text-gray-700">Reason</th>
                          <th className="text-left p-3 font-medium text-gray-700">Rejected Date</th>
                          <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rejectedWithdrawals.map((withdrawal: any) => (
                          <tr key={withdrawal.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{withdrawal.userName}</p>
                                <p className="text-sm text-gray-500">{withdrawal.userEmail}</p>
                                <p className="text-xs text-gray-400">ID: {withdrawal.userDisplayId}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                withdrawal.type === 'Bank Transfer' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {withdrawal.type}
                              </span>
                            </td>
                            <td className="p-3 font-medium">
                              ₹{withdrawal.amount.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <p className="text-sm text-red-600 max-w-xs truncate" title={withdrawal.reason}>
                                {withdrawal.reason || 'No reason provided'}
                              </p>
                            </td>
                            <td className="p-3 text-sm text-gray-500">
                              {new Date(withdrawal.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3">
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleReactivateWithdrawal(withdrawal.id)}
                                  disabled={reactivateWithdrawalMutation.isPending}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {reactivateWithdrawalMutation.isPending ? 'Reactivating...' : 'Reconsider'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Withdrawal Section */}
          {activeSection === 'withdraw-personally' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-volt-light" />
                  Admin Withdrawal
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Create withdrawal requests on behalf of users
                </p>
              </CardHeader>
              <CardContent>
                <WithdrawPersonallyForm />
              </CardContent>
            </Card>
          )}

          {/* Withdrawal History Section */}
          {activeSection === 'withdrawal-history' && (
            <WithdrawalHistoryTable />
          )}

          {/* Send Fund Section */}
          {activeSection === 'send-fund' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-volt-light" />
                  Send Fund
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Credit or debit funds to/from user wallets
                </p>
              </CardHeader>
              <CardContent>
                <SendFundForm />
              </CardContent>
            </Card>
          )}

          {/* Fund History Section */}
          {activeSection === 'fund-history' && (
            <FundHistoryTable />
          )}

          {/* Pending Fund Requests Section */}
          {activeSection === 'pending-fund-requests' && (
            <FundRequestsTable 
              statusFilter="pending"
              title="Pending Fund Requests"
              description="Fund requests awaiting admin approval"
            />
          )}

          {/* Approved Fund Requests Section */}
          {activeSection === 'approved-fund-requests' && (
            <FundRequestsTable 
              statusFilter="approved"
              title="Approved Fund Requests"
              description="Successfully approved fund requests"
            />
          )}

          {/* Rejected Fund Requests Section */}
          {activeSection === 'rejected-fund-requests' && (
            <FundRequestsTable 
              statusFilter="rejected"
              title="Rejected Fund Requests"
              description="Fund requests that were rejected"
            />
          )}

          {/* KYC Management Sections */}
          {activeSection === 'pending-kyc' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-yellow-500" />
                  Pending KYC Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PendingKYCSection />
              </CardContent>
            </Card>
          )}

          {activeSection === 'approved-kyc' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-green-500" />
                  Approved KYC Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovedKYCSection />
              </CardContent>
            </Card>
          )}

          {activeSection === 'rejected-kyc' && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-red-500" />
                  Rejected KYC Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RejectedKYCSection />
              </CardContent>
            </Card>
          )}

          {/* Product Management Section */}
          {activeSection === 'product-management' && (
            <AdminProductManagement />
          )}

          {/* Purchases Section */}
          {activeSection === 'purchases' && (
            <AdminPurchasesTable />
          )}

          {/* Coupon Management Section */}
          {activeSection === 'coupon-management' && (
            <AdminCouponManagement />
          )}

          {/* Daily Order Report Section */}
          {activeSection === 'daily-report' && (
            <AdminDailyReport />
          )}

          {/* Today's Joinings Section */}
          {activeSection === 'today-joinings' && (
            <div className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-volt-light" />
                  Today's Activations
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Users who were activated today ({new Date().toLocaleDateString()})
                </p>
                </CardHeader>
                <CardContent>
                  {todayJoiningsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-volt-light mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading today's activations...</p>
                    </div>
                  ) : (todayJoinings as User[]).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No Activations Today</h3>
                      <p className="text-gray-600 mb-4">
                        No users have been activated today. Check back later or review previous days.
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={todayJoiningsLoading}
                              onClick={handleRefreshTodayJoinings}
                            >
                              <RefreshCw className={`mr-2 h-4 w-4 ${todayJoiningsLoading ? 'animate-spin' : ''}`} />
                              {todayJoiningsLoading ? 'Refreshing...' : 'Refresh'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Refresh data (F5 or Ctrl+R)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Found {(todayJoinings as User[]).length} user{(todayJoinings as User[]).length !== 1 ? 's' : ''} who were activated today
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={todayJoiningsLoading}
                                onClick={handleRefreshTodayJoinings}
                              >
                                <RefreshCw className={`mr-2 h-4 w-4 ${todayJoiningsLoading ? 'animate-spin' : ''}`} />
                                {todayJoiningsLoading ? 'Refreshing...' : 'Refresh'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Refresh data (F5 or Ctrl+R)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      {/* User Management Table for Today's Joinings */}
                      <UserManagementTable 
                        users={todayJoinings as any}
                        walletData={walletDataMap}
                        withdrawalData={withdrawalDataMap}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Paid Members Section */}
          {activeSection === 'paid-members' && (
            <div className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-volt-light" />
                    Paid Members
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Users with approved KYC, complete bank details, and who have made transactions
                  </p>
                </CardHeader>
                <CardContent>
                  {paidMembersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-volt-light mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading paid members...</p>
                    </div>
                  ) : (paidMembers as User[]).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No Paid Members</h3>
                      <p className="text-gray-600 mb-4">
                        No users meet the paid member criteria. Users need approved KYC, complete bank details, and at least one transaction.
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={paidMembersLoading}
                              onClick={handleRefreshPaidMembers}
                            >
                              <RefreshCw className={`mr-2 h-4 w-4 ${paidMembersLoading ? 'animate-spin' : ''}`} />
                              {paidMembersLoading ? 'Refreshing...' : 'Refresh'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Refresh data (F5 or Ctrl+R)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Found {(paidMembers as User[]).length} paid member{(paidMembers as User[]).length !== 1 ? 's' : ''}
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={paidMembersLoading}
                                onClick={handleRefreshPaidMembers}
                              >
                                <RefreshCw className={`mr-2 h-4 w-4 ${paidMembersLoading ? 'animate-spin' : ''}`} />
                                {paidMembersLoading ? 'Refreshing...' : 'Refresh'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Refresh data (F5 or Ctrl+R)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <UserManagementTable 
                        users={paidMembers as any}
                        walletData={walletDataMap}
                        withdrawalData={withdrawalDataMap}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Free Users Section */}
          {activeSection === 'free-users' && (
            <div className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-volt-light" />
                    Free Users
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Users with no package amount (package amount = 0 or null)
                  </p>
                </CardHeader>
                <CardContent>
                  {freeUsersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-volt-light mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading free users...</p>
                    </div>
                  ) : (freeUsers as User[]).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No Free Users</h3>
                      <p className="text-gray-600 mb-4">
                        No users found with zero package amount. All users have active packages.
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={freeUsersLoading}
                              onClick={handleRefreshFreeUsers}
                            >
                              <RefreshCw className={`mr-2 h-4 w-4 ${freeUsersLoading ? 'animate-spin' : ''}`} />
                              {freeUsersLoading ? 'Refreshing...' : 'Refresh'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Refresh data (F5 or Ctrl+R)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Found {(freeUsers as User[]).length} free user{(freeUsers as User[]).length !== 1 ? 's' : ''}
                        </p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={freeUsersLoading}
                                onClick={handleRefreshFreeUsers}
                              >
                                <RefreshCw className={`mr-2 h-4 w-4 ${freeUsersLoading ? 'animate-spin' : ''}`} />
                                {freeUsersLoading ? 'Refreshing...' : 'Refresh'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Refresh data (F5 or Ctrl+R)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FreeUsersTable 
                        users={freeUsers as any}
                        walletData={walletDataMap}
                        withdrawalData={withdrawalDataMap}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Performance Report */}
          {activeSection === 'user-performance-report' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Performance Report</h2>
                <p className="text-gray-600 mt-1">Comprehensive user-grouped income, BV metrics, and eligibility tracking</p>
              </div>
              <UserPerformanceReport />
            </div>
          )}

          {/* Income History in Reports */}
          {activeSection === 'income-history' && (
            <IncomeReportsTable 
              reportType="all"
              title="Income History - All Income Transactions"
              description="Complete history of all income transactions across users"
            />
          )}

          {/* Hidden: Direct Income Report (Oct 17, 2025) - Redundant with BV Transactions Report
          {activeSection === 'direct-income' && (
            <IncomeReportsTable
              reportType="direct"
              title="Direct Income Report"
              description="Sponsor income earned from direct recruits"
            />
          )}
          */}

          {/* Hidden: ROI Income Report
          {activeSection === 'roi-income' && (
            <IncomeReportsTable
              reportType="roi"
              title="ROI Income Report"
              description="Sales incentives and bonuses"
            />
          )}
          */}

          {/* Hidden: Salary Income Report
          {activeSection === 'salary-income' && (
            <IncomeReportsTable
              reportType="salary"
              title="Salary Income Report"
              description="Consistency bonuses and leadership funds"
            />
          )}
          */}

          {/* BV Transactions Report */}
          {activeSection === 'bv-transactions-report' && (
            <BVTransactionsReport />
          )}

          {/* Monthly BV Report */}
          {activeSection === 'monthly-bv-report' && (
            <MonthlyBVReport />
          )}

          {/* Enhanced Section Content for other sections */}
          {(activeSection === 'manage-fund' ||
            activeSection === 'pending-fund') && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5 text-volt-light" />
                  {activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-volt-light/10 rounded-full flex items-center justify-center mb-4">
                    <Settings className="h-8 w-8 text-volt-light" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Under Development</h3>
                  <p className="text-gray-600 mb-4">
                    This {activeSection.replace('-', ' ')} section is being built with advanced features and real-time data.
                  </p>
                  <Button className="volt-gradient text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Configure {activeSection.replace('-', ' ').split(' ')[0]}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legacy sections for backwards compatibility */}
          {(activeSection === 'users' || activeSection === 'kyc' || activeSection === 'withdrawals' || activeSection === 'reports' || activeSection === 'franchise') && (
            <Card className="border-l-4 border-volt-light">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-volt-light" />
                  Legacy Section - {activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400 mb-4">
                  <p className="text-gray-700 mb-2">
                    This is the legacy section. For better functionality, please use the new expandable menu options in the sidebar.
                  </p>
                  <p className="text-volt-light font-medium text-sm">
                    ↗ Use the sidebar menus: User Details, Income Reports, KYC Details, Withdraw Management, etc.
                  </p>
                </div>
                <Button className="volt-gradient text-white">
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Go to New Section
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

                      {/* Add User Dialog - Now handled by AdminReferralLinkGeneration component */}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input name="firstName" defaultValue={editingUser.firstName || ''} required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input name="lastName" defaultValue={editingUser.lastName || ''} required />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input name="email" type="email" defaultValue={editingUser.email || ''} required />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={editingUser.role} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingUser.status} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="volt-gradient text-white"
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Reason for rejection</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejecting this withdrawal request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleCancelRejection}
              disabled={rejectWithdrawalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRejection}
              disabled={rejectWithdrawalMutation.isPending || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectWithdrawalMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports Guide Dialog */}
      <ReportsGuide 
        open={reportsGuideOpen} 
        onOpenChange={setReportsGuideOpen} 
      />
    </div>
  );
}


