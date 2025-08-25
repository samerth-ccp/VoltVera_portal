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
import { Users, UserCheck, Crown, Clock, Plus, Menu, X, Settings, Lock, BarChart3, FileText, Shield, DollarSign, Award, Search, Filter, ChevronDown, ChevronRight, Wallet, TrendingUp, Activity, Mail, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User, CreateUser } from "@shared/schema";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import DataTable from "@/components/ui/data-table";
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
    <div className="min-h-screen bg-slate-900">
      {/* Mobile menu overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-slate-800 text-white z-30 transform transition-transform lg:translate-x-0 overflow-y-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 border-b border-slate-700 px-4">
          <div className="flex items-center">
            <VoltverashopLogo size="small" />
            <div className="ml-3">
              <div className="text-lg font-bold">Voltverashop</div>
              <div className="text-xs text-slate-400">Admin Portal</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-slate-700"
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
              activeSection === 'dashboard' ? 'bg-orange-600 text-white' : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            <BarChart3 className="mr-3 h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          {/* User Details Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleMenu('users')}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-orange-600 transition-colors group"
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
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'all-members' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  All Members
                </button>
                <button 
                  onClick={() => setActiveSection('paid-members')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'paid-members' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Paid Members
                </button>
                <button 
                  onClick={() => setActiveSection('today-joinings')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'today-joinings' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  View Today Joinings
                </button>
                <button 
                  onClick={() => setActiveSection('free-users')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'free-users' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Free Users
                </button>
                <button 
                  onClick={() => setActiveSection('user-activities')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'user-activities' ? 'text-orange-400' : 'text-slate-300'
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
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-orange-600 transition-colors group"
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
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'direct-income' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Direct Income
                </button>
                <button 
                  onClick={() => setActiveSection('roi-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'roi-income' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  ROI Income
                </button>
                <button 
                  onClick={() => setActiveSection('salary-income')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'salary-income' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Salary Income
                </button>
                <button 
                  onClick={() => setActiveSection('payout-summary')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'payout-summary' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Payout Summary
                </button>
                <button 
                  onClick={() => setActiveSection('holiday-reward')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'holiday-reward' ? 'text-orange-400' : 'text-slate-300'
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
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-orange-600 transition-colors group"
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
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'pending-kyc' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Pending KYC Requests
                </button>
                <button 
                  onClick={() => setActiveSection('approved-kyc')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'approved-kyc' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Approved KYC Requests
                </button>
                <button 
                  onClick={() => setActiveSection('rejected-kyc')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'rejected-kyc' ? 'text-orange-400' : 'text-slate-300'
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
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-orange-600 transition-colors group"
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
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'pending-withdraw' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Pending Withdraw Requests
                </button>
                <button 
                  onClick={() => setActiveSection('approved-withdraw')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'approved-withdraw' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Approved Withdraw Requests
                </button>
                <button 
                  onClick={() => setActiveSection('rejected-withdraw')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'rejected-withdraw' ? 'text-orange-400' : 'text-slate-300'
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
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-orange-600 transition-colors group"
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
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'send-fund' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Send Fund
                </button>
                <button 
                  onClick={() => setActiveSection('fund-history')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'fund-history' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Fund History
                </button>
                <button 
                  onClick={() => setActiveSection('manage-fund')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'manage-fund' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Manage Fund
                </button>
                <button 
                  onClick={() => setActiveSection('pending-fund')}
                  className={`block w-full px-4 py-2 text-left text-sm rounded hover:bg-slate-700 ${
                    activeSection === 'pending-fund' ? 'text-orange-400' : 'text-slate-300'
                  }`}
                >
                  Pending Fund Requests
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4 mt-6">
            <Link href="/change-password">
              <button className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-slate-700 text-slate-300">
                <Lock className="mr-3 h-5 w-5" />
                <span className="font-medium">Change Password</span>
              </button>
            </Link>
            <button 
              onClick={() => {
                fetch('/api/logout', { method: 'POST', credentials: 'include' })
                  .then(() => window.location.href = '/');
              }}
              className="flex items-center w-full px-4 py-3 text-left rounded-lg hover:bg-slate-700 text-slate-300"
            >
              <span className="mr-3">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Modern Header */}
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-4 text-white hover:bg-slate-700"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-sm text-slate-400">Starter Page</p>
                <p className="text-white font-medium">SMS Left: 2712</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400 w-64"
                />
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <RefreshCw className="mr-2 h-4 w-4" />
                Withdraw Refresh
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  A
                </div>
                <span className="text-white font-medium">{user.firstName} {user.lastName}</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Modern Dashboard Content */}
        <div className="p-6 bg-slate-900 min-h-screen">
          {activeSection === 'dashboard' && (
            <>
              {/* Modern Statistical Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Payout Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">TOTAL PAYOUT</p>
                      <p className="text-white text-2xl font-bold">₹{adminStats?.totalBV || '277,506.08'}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Direct Income Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">DIRECT INCOME</p>
                      <p className="text-white text-2xl font-bold">₹{adminStats?.monthlyIncome || '0.00'}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* ROI Income Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">ROI INCOME</p>
                      <p className="text-white text-2xl font-bold">₹187,462.29</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </div>

                {/* Salary Income Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">SALARY INCOME</p>
                      <p className="text-white text-2xl font-bold">₹13,664.49</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Activity className="h-6 w-6 text-orange-400" />
                    </div>
                  </div>
                </div>

                {/* Members Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">MEMBERS</p>
                      <p className="text-white text-2xl font-bold">{adminStats?.totalUsers || '1,463'}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Today Withdraw Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">TODAY WITHDRAW</p>
                      <p className="text-white text-2xl font-bold">{adminStats?.withdrawalRequests || '0'}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-red-400" />
                    </div>
                  </div>
                </div>

                {/* Today Active Members Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">TODAY ACTIVE MEMBERS</p>
                      <p className="text-white text-2xl font-bold">{adminStats?.activeUsers || '0'}</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* Today Deposit Members Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">TODAY DEPOSIT MEMBERS</p>
                      <p className="text-white text-2xl font-bold">0</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-yellow-400" />
                    </div>
                  </div>
                </div>

                {/* Paid Members Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">PAID MEMBERS</p>
                      <p className="text-white text-2xl font-bold">349</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Crown className="h-6 w-6 text-gold-400" />
                    </div>
                  </div>
                </div>

                {/* Today Joined Members Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">TODAY JOINED MEMBERS</p>
                      <p className="text-white text-2xl font-bold">0</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Plus className="h-6 w-6 text-cyan-400" />
                    </div>
                  </div>
                </div>

                {/* Withdrawal Status Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">WITHDRAWAL STATUS</p>
                      <p className="text-green-400 text-2xl font-bold">ON</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Shield className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </div>

                {/* E-mail Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">E-MAIL</p>
                      <p className="text-white text-lg">Total: 0</p>
                      <p className="text-white text-lg">Read: 0</p>
                      <p className="text-white text-lg">Unread: 0</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Mail className="h-6 w-6 text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* S Wallet Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">S WALLET</p>
                      <p className="text-white text-lg">Wallet Bal: $4,342.48</p>
                      <p className="text-white text-lg">Used: $4,807.49</p>
                      <p className="text-white text-lg">Requested: $91,546.17</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Today Payout Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-slate-400 text-sm uppercase tracking-wider">TODAY PAYOUT</p>
                      <p className="text-white text-lg">Today Matching: 0.00</p>
                      <p className="text-white text-lg">Today Paid DI: 0</p>
                      <p className="text-white text-lg">Today Business: 0</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-pink-400" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeSection === 'all-members' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <h3 className="text-lg font-medium text-white mb-6">All Members Management</h3>
              {/* Enhanced User Search */}
              <div className="bg-slate-700 rounded-lg p-6 mb-6 border border-slate-600">
                <h4 className="text-md font-medium text-white mb-4">Advanced User Search</h4>
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
                  <p className="text-sm text-slate-300">
                    Found {users.length} user{users.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-500 text-slate-300 hover:bg-slate-600"
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
              
              {/* User Table */}
              <DataTable
                users={users}
                onEdit={setEditingUser}
                onDelete={handleDeleteUser}
                onSearch={setSearch}
              />
            </div>
          )}

          {/* Other section placeholders */}
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
            activeSection === 'pending-withdraw' ||
            activeSection === 'approved-withdraw' ||
            activeSection === 'rejected-withdraw' ||
            activeSection === 'send-fund' ||
            activeSection === 'fund-history' ||
            activeSection === 'manage-fund' ||
            activeSection === 'pending-fund') && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <h3 className="text-lg font-medium text-white mb-4">
                {activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <p className="text-slate-400">
                This section is under development. Content will be added based on the {activeSection.replace('-', ' ')} functionality.
              </p>
            </div>
          )}

          {/* Legacy sections for backwards compatibility - these will be removed */}
          {(activeSection === 'users' || activeSection === 'kyc' || activeSection === 'withdrawals' || activeSection === 'reports' || activeSection === 'franchise') && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <h3 className="text-lg font-medium text-white mb-4">
                Legacy Section - {activeSection.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <p className="text-slate-400 mb-4">
                This is the legacy section. Please use the new expandable menu options in the sidebar for better functionality.
              </p>
              <p className="text-orange-400 text-sm">
                ↗ Use the sidebar menus: User Details, Income Reports, KYC Details, Withdraw Management, etc.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-600">
          <DialogHeader>
            <DialogTitle className="text-white">Invite New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
              <Input 
                name="fullName" 
                placeholder="Enter full name" 
                required 
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <Input 
                name="email" 
                type="email" 
                placeholder="Enter email address" 
                required 
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-slate-300">Role</Label>
              <Select name="role" defaultValue="user" required>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddUserOpen(false)}
                className="border-slate-500 text-slate-300 hover:bg-slate-600"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "Sending Invitation..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-600">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                <Input 
                  name="firstName" 
                  defaultValue={editingUser.firstName || ''} 
                  required 
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                <Input 
                  name="lastName" 
                  defaultValue={editingUser.lastName || ''} 
                  required 
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <Input 
                  name="email" 
                  type="email" 
                  defaultValue={editingUser.email || ''} 
                  required 
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-slate-300">Role</Label>
                <Select name="role" defaultValue={editingUser.role} required>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status" className="text-slate-300">Status</Label>
                <Select name="status" defaultValue={editingUser.status} required>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  className="border-slate-500 text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-orange-600 hover:bg-orange-700 text-white"
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
