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
import { Users, UserCheck, Crown, Clock, Plus, Menu, X, Settings, Lock } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { User, CreateUser } from "@shared/schema";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import DataTable from "@/components/ui/data-table";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  pendingUsers: number;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users", search],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Fetch user stats
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
        title: "Success",
        description: "User created successfully",
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

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 volt-gradient text-white z-30 transform transition-transform lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-20 border-b border-white/20 px-4">
          <div className="flex items-center">
            <VoltverashopLogo size="small" />
            <div className="ml-3">
              <div className="text-lg font-bold">Voltverashop</div>
              <div className="text-xs opacity-75">Admin Portal</div>
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
        
        <nav className="mt-8">
          <div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">Management</div>
          <a href="#" className="flex items-center px-6 py-3 text-white bg-white/10">
            <Users className="mr-3 h-5 w-5" />
            User Management
          </a>
          
          <div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider mt-8">Account</div>
          <Link href="/change-password">
            <button className="flex items-center px-6 py-3 text-white/90 hover:bg-white/10 hover:text-white transition-colors w-full text-left">
              <Lock className="mr-3 h-5 w-5" />
              Change Password
            </button>
          </Link>
          <button 
            onClick={() => {
              fetch('/api/logout', { method: 'POST', credentials: 'include' })
                .then(() => window.location.href = '/');
            }}
            className="flex items-center px-6 py-3 text-white/90 hover:bg-white/10 hover:text-white transition-colors w-full text-left"
          >
            <span className="mr-3">🚪</span>
            Logout
          </button>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">User Management</h1>
                <p className="text-gray-600 text-sm hidden sm:block">Manage portal users and their access</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="volt-gradient text-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
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
                      <Label htmlFor="password">Password</Label>
                      <Input name="password" type="password" placeholder="Enter password" required />
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
                        className="volt-gradient text-white"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Adding..." : "Add User"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
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
        
        {/* Dashboard Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="h-4 w-4 text-volt-light" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">{stats?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">{stats?.activeUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
                <Crown className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">{stats?.adminUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-800">{stats?.pendingUsers || 0}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* User Table */}
          <DataTable
            users={users}
            onEdit={setEditingUser}
            onDelete={handleDeleteUser}
            onSearch={setSearch}
          />

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
      </div>
    </div>
  );
}
