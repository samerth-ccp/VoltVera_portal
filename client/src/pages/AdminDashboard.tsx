import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Crown, Clock, Plus, Menu, X, Settings, Lock, BarChart3, FileText, Shield, DollarSign, Award, Search, Filter, ChevronDown, ChevronRight, Wallet, TrendingUp, Activity, Mail, RefreshCw, CheckCircle, XCircle, Link2, Copy } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User, CreateUser } from "@shared/schema";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import DataTable from "@/components/ui/data-table";
import UserManagementTable from "@/components/UserManagementTable";
import { AdminPendingRecruits } from "@/components/AdminPendingRecruits";
import { NotificationCenter } from "@/components/NotificationCenter";

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
  totalBV: string;
  monthlyIncome: string;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'id' | 'name' | 'bv' | 'rank'>('name');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
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

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Fetch users with enhanced search
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users/search", searchQuery, searchType, statusFilter, roleFilter, kycFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (searchType) params.append('searchType', searchType);
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (kycFilter) params.append('kycStatus', kycFilter);
      
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
    queryFn: () => apiRequest('GET', '/api/admin/wallet-balances'),
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch withdrawal data for all users
  const { data: withdrawalRequests = [] } = useQuery({
    queryKey: ["/api/admin/withdrawals"],
    queryFn: () => apiRequest('GET', '/api/admin/withdrawals'),
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
  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === 'admin',
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
      setIsAddUserOpen(false);
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
                <button 
                  onClick={() => setActiveSection('user-activities')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'user-activities' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Users Activities
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
                  onClick={() => setActiveSection('direct-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'direct-income' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Direct Income
                </button>
                <button 
                  onClick={() => setActiveSection('roi-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'roi-income' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  ROI Income
                </button>
                <button 
                  onClick={() => setActiveSection('salary-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'salary-income' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Salary Income
                </button>
                <button 
                  onClick={() => setActiveSection('payout-summary')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'payout-summary' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Payout Summary
                </button>
                <button 
                  onClick={() => setActiveSection('holiday-reward')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'holiday-reward' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Holiday Reward Summary
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
                  onClick={() => setActiveSection('manage-fund')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'manage-fund' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Manage Fund
                </button>
                <button 
                  onClick={() => setActiveSection('pending-fund')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-white/10 ${
                    activeSection === 'pending-fund' ? 'text-yellow-300' : 'text-white/80'
                  }`}
                >
                  Pending Fund Requests
                </button>
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
              <NotificationCenter />
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="volt-gradient text-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
              </Dialog>

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

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-gray-800 flex items-center">
                      <Award className="mr-2 h-5 w-5 text-purple-500" />
                      Franchise Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-purple-500">{adminStats?.franchiseRequests || 0}</div>
                    <p className="text-sm text-gray-500 mt-2">Applications under review</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Activity */}
              <Card className="mb-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-volt-light" />
                    Recent Admin Actions Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">KYC Document Submitted</p>
                          <p className="text-sm text-gray-600">User ID: VTR001234 - Aadhaar & PAN verification</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="volt-gradient text-white">Review</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Withdrawal Request</p>
                          <p className="text-sm text-gray-600">Amount: ₹5,000 - User ID: VTR005678</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="volt-gradient text-white">Approve</Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Franchise Application</p>
                          <p className="text-sm text-gray-600">Mini Franchise - Location: Mumbai</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="volt-gradient text-white">Review</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {activeSection === 'all-members' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-6">All Members Management</h3>
              {/* Enhanced User Search */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <h4 className="text-md font-medium text-gray-800 mb-4">Advanced User Search</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="searchQuery">Search Query</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="searchQuery"
                        placeholder="Enter search term..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="searchType">Search Type</Label>
                    <Select value={searchType} onValueChange={(value: 'id' | 'name' | 'bv' | 'rank') => setSearchType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="id">User ID</SelectItem>
                        <SelectItem value="bv">BV Amount</SelectItem>
                        <SelectItem value="rank">Rank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="statusFilter">Status Filter</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
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
                    <Label htmlFor="kycFilter">KYC Status</Label>
                    <Select value={kycFilter} onValueChange={setKycFilter}>
                      <SelectTrigger>
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
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Found {users.length} user{users.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchType('name');
                      setStatusFilter('all');
                      setRoleFilter('all');
                      setKycFilter('all');
                    }}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
              
              {/* Complete User Management Table */}
              <UserManagementTable 
                users={users}
                walletData={walletDataMap}
                withdrawalData={withdrawalDataMap}
              />
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
              </CardHeader>
              <CardContent>
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
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">John Doe</p>
                            <p className="text-sm text-gray-500">john.doe@example.com</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Bank Transfer
                          </span>
                        </td>
                        <td className="p-3 font-medium">₹5,000.00</td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p>HDFC Bank</p>
                            <p className="text-gray-500">****1234</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-500">Aug 25, 2025</td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button size="sm" className="volt-gradient text-white">Approve</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Reject</Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">Jane Smith</p>
                            <p className="text-sm text-gray-500">jane.smith@example.com</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            USDT (TRC20)
                          </span>
                        </td>
                        <td className="p-3 font-medium">$100.00</td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-mono">TBiQ7...4D2a</p>
                            <p className="text-gray-500">TRC20 Network</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-500">Aug 25, 2025</td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button size="sm" className="volt-gradient text-white">Approve</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Reject</Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-700">User</th>
                        <th className="text-left p-3 font-medium text-gray-700">Type</th>
                        <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                        <th className="text-left p-3 font-medium text-gray-700">Details</th>
                        <th className="text-left p-3 font-medium text-gray-700">Status</th>
                        <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">Alice Johnson</p>
                            <p className="text-sm text-gray-500">alice.j@example.com</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            USDT (BEP20)
                          </span>
                        </td>
                        <td className="p-3 font-medium">$250.00</td>
                        <td className="p-3">
                          <div className="text-sm">
                            <p className="font-mono">0x7b2...9c4f</p>
                            <p className="text-gray-500">BEP20 Network</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Processed
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="text-blue-600">View Details</Button>
                            <Button size="sm" variant="outline" className="text-gray-600">Transaction ID</Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-700">User</th>
                        <th className="text-left p-3 font-medium text-gray-700">Type</th>
                        <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                        <th className="text-left p-3 font-medium text-gray-700">Reason</th>
                        <th className="text-left p-3 font-medium text-gray-700">Date</th>
                        <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">Bob Wilson</p>
                            <p className="text-sm text-gray-500">bob.w@example.com</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Bank Transfer
                          </span>
                        </td>
                        <td className="p-3 font-medium">₹10,000.00</td>
                        <td className="p-3">
                          <p className="text-sm text-red-600">Insufficient KYC documentation</p>
                        </td>
                        <td className="p-3 text-sm text-gray-500">Aug 24, 2025</td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="text-blue-600">Reconsider</Button>
                            <Button size="sm" variant="outline" className="text-gray-600">Contact User</Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Section Content for other sections */}
          {(activeSection === 'paid-members' || 
            activeSection === 'today-joinings' || 
            activeSection === 'free-users' || 
            activeSection === 'user-activities' ||
            activeSection === 'direct-income' ||
            activeSection === 'roi-income' ||
            activeSection === 'salary-income' ||
            activeSection === 'payout-summary' ||
            activeSection === 'holiday-reward' ||
            activeSection === 'pending-kyc' ||
            activeSection === 'approved-kyc' ||
            activeSection === 'rejected-kyc' ||
            activeSection === 'send-fund' ||
            activeSection === 'fund-history' ||
            activeSection === 'manage-fund' ||
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

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* User Creation Method Selection */}
            <div>
              <Label className="text-base font-medium">How would you like to add this user?</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Card 
                  className="cursor-pointer hover:bg-gray-50 border-2 hover:border-volt-light transition-colors"
                  onClick={() => setActiveSection('create-direct')}
                >
                  <CardContent className="p-4 text-center">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-volt-light" />
                    <h3 className="font-medium">Send Invitation</h3>
                    <p className="text-sm text-gray-600">Email invitation with login details</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:bg-gray-50 border-2 hover:border-volt-light transition-colors"
                  onClick={() => setActiveSection('create-referral')}
                >
                  <CardContent className="p-4 text-center">
                    <Link2 className="h-8 w-8 mx-auto mb-2 text-volt-light" />
                    <h3 className="font-medium">Generate Referral Link</h3>
                    <p className="text-sm text-gray-600">Let them register via referral link</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Direct Invitation Form */}
            {activeSection === 'create-direct' && (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input name="fullName" placeholder="Enter full name" required />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input name="email" type="email" placeholder="Enter email address" required />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="user" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="volt-gradient text-white flex-1"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            )}

            {/* Referral Link Generation */}
            {activeSection === 'create-referral' && (
              <ReferralLinkForm onClose={() => setIsAddUserOpen(false)} />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}

// Referral Link Form Component for Admin
function ReferralLinkForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [placementSide, setPlacementSide] = useState<'left' | 'right'>('left');

  const generateReferralLink = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', '/api/referral/generate', {
        placementSide,
        generatedByRole: user.role
      });

      console.log('API Response:', response);
      console.log('URL from response:', response.url);
      
      if (response.url) {
        setGeneratedLink(response.url);
        toast({
          title: "Success",
          description: "Referral link generated successfully",
        });
      } else {
        console.error('No URL in response:', response);
        toast({
          title: "Error",
          description: "No URL received from server",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating referral link:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral link",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: "Copied",
      description: "Referral link copied to clipboard",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="placement">Placement Side</Label>
        <Select value={placementSide} onValueChange={(value: 'left' | 'right') => setPlacementSide(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select placement side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left Side</SelectItem>
            <SelectItem value="right">Right Side</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Choose which side of your binary tree the new recruit will be placed on.
        </p>
      </div>

      <Button 
        onClick={generateReferralLink} 
        disabled={isGenerating}
        className="w-full volt-gradient text-white"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" />
            Generate Referral Link
          </>
        )}
      </Button>

      {generatedLink && (
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <Label>Generated Referral Link</Label>
          <div className="flex space-x-2">
            <Input 
              value={generatedLink} 
              readOnly 
              className="flex-1 font-mono text-sm"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            ⏰ Link expires in 48 hours. Share this with potential recruits.
          </p>
          <p className="text-xs text-gray-600">
            📧 The recruit will fill out the registration form and you'll need to approve them from "Pending Recruits".
          </p>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {generatedLink ? 'Done' : 'Cancel'}
        </Button>
        {generatedLink && (
          <Button 
            onClick={() => {
              copyToClipboard();
              onClose();
            }}
            className="volt-gradient text-white flex-1"
          >
            Copy & Close
          </Button>
        )}
      </div>
    </div>
  );
}
