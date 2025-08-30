import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  LogIn, 
  Edit, 
  UserX, 
  Eye, 
  EyeOff, 
  Copy,
  Download,
  Filter
} from "lucide-react";

interface User {
  id: string;
  userId?: string; // Login ID (e.g., VV0007)
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  sponsorId?: string;
  packageAmount: string;
  cryptoWalletAddress?: string;
  txnPin?: string;
  password?: string; // Hashed password from backend
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  // Derived fields from other tables
  walletBalance?: number;
  totalEarnings?: number;
  totalWithdrawals?: number;
  withdrawStatus?: string;
}

interface UserManagementTableProps {
  users: User[];
  walletData: Record<string, { balance: number; totalEarnings: number; totalWithdrawals: number }>;
  withdrawalData: Record<string, { status: string }>;
}

export default function UserManagementTable({ users, walletData, withdrawalData }: UserManagementTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login as user mutation
  const loginAsUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/admin/login-as-user/${userId}`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged in as user successfully",
      });
      window.location.href = '/dashboard';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to login as user",
        variant: "destructive",
      });
    },
  });

  // Block/Unblock user mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      return apiRequest(`/api/admin/users/${userId}/status`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      return apiRequest(`/api/admin/users/${userData.id}`, 'PATCH', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = !search || 
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.userId?.toLowerCase().includes(search.toLowerCase()) ||
      user.id?.toLowerCase().includes(search.toLowerCase()) ||
      user.mobile?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const togglePinVisibility = (userId: string) => {
    setShowPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const exportUserData = () => {
    const csvData = filteredUsers.map(user => {
      const wallet = walletData[user.id];
      const withdrawal = withdrawalData[user.id];
      
      return [
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.mobile || '',
        user.email,
        '***', // Password placeholder
        user.txnPin || '',
        user.sponsorId || '',
        user.packageAmount,
        user.cryptoWalletAddress || '',
        wallet?.balance || 0,
        wallet?.totalEarnings || 0,
        wallet?.totalWithdrawals || 0,
        withdrawal?.status || 'None',
        new Date(user.registrationDate).toLocaleDateString()
      ].join(',');
    });
    
    const headers = ['User ID', 'Name', 'Phone', 'Email', 'Password', 'TXN Pin', 'Sponsor ID', 'Total Package', 'Wallet Address', 'E-wallet', 'Income', 'Total Withdraw', 'Withdraw Status', 'Joining Date'];
    const csv = [headers.join(','), ...csvData].join('\\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_management_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate(editingUser);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>User Management System</span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportUserData}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by User ID, Name, Email, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-user-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Blocked</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Management Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                  <TableHead className="min-w-[120px]">Withdraw Status</TableHead>
                  <TableHead className="min-w-[150px]">User ID</TableHead>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[150px]">Phone</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Password</TableHead>
                  <TableHead className="min-w-[120px]">TXN Pin</TableHead>
                  <TableHead className="min-w-[150px]">Sponsor ID</TableHead>
                  <TableHead className="min-w-[130px]">Total Package</TableHead>
                  <TableHead className="min-w-[200px]">Wallet Address</TableHead>
                  <TableHead className="min-w-[120px]">E-wallet</TableHead>
                  <TableHead className="min-w-[120px]">Income</TableHead>
                  <TableHead className="min-w-[120px]">Total Withdraw</TableHead>
                  <TableHead className="min-w-[130px]">Joining Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const wallet = walletData[user.id];
                  const withdrawal = withdrawalData[user.id];
                  
                  return (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      {/* Actions */}
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loginAsUserMutation.mutate(user.id)}
                            disabled={loginAsUserMutation.isPending}
                            data-testid={`button-login-${user.id}`}
                          >
                            <LogIn className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={user.status === 'active' ? 'text-red-600' : 'text-green-600'}
                            onClick={() => toggleUserStatusMutation.mutate({
                              userId: user.id,
                              status: user.status === 'active' ? 'inactive' : 'active'
                            })}
                            disabled={toggleUserStatusMutation.isPending}
                            data-testid={`button-block-${user.id}`}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Withdraw Status */}
                      <TableCell>
                        <Badge variant={
                          withdrawal?.status === 'approved' ? 'success' :
                          withdrawal?.status === 'pending' ? 'secondary' :
                          withdrawal?.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {withdrawal?.status || 'None'}
                        </Badge>
                      </TableCell>

                      {/* User ID */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{user.userId || user.id}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(user.userId || user.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">
                            <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                              {user.status}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>{user.mobile || '-'}</TableCell>

                      {/* Email */}
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={user.email}>
                          {user.email}
                        </div>
                      </TableCell>

                      {/* Password */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {showPasswords[user.id] ? 'voltveratech123' : '••••••••••••••'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePasswordVisibility(user.id)}
                          >
                            {showPasswords[user.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>

                      {/* TXN Pin */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {user.txnPin ? (showPins[user.id] ? user.txnPin : '••••') : '-'}
                          </span>
                          {user.txnPin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePinVisibility(user.id)}
                            >
                              {showPins[user.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Sponsor ID */}
                      <TableCell>
                        <span className="font-mono text-sm">{user.sponsorId || '-'}</span>
                      </TableCell>

                      {/* Total Package */}
                      <TableCell>
                        <span className="font-medium">₹{parseFloat(user.packageAmount).toLocaleString()}</span>
                      </TableCell>

                      {/* Wallet Address */}
                      <TableCell>
                        <div className="max-w-[200px] truncate font-mono text-sm" title={user.cryptoWalletAddress}>
                          {user.cryptoWalletAddress || '-'}
                        </div>
                      </TableCell>

                      {/* E-wallet */}
                      <TableCell>
                        <span className="font-medium">₹{(wallet?.balance || 0).toLocaleString()}</span>
                      </TableCell>

                      {/* Income */}
                      <TableCell>
                        <span className="font-medium text-green-600">₹{(wallet?.totalEarnings || 0).toLocaleString()}</span>
                      </TableCell>

                      {/* Total Withdraw */}
                      <TableCell>
                        <span className="font-medium text-blue-600">₹{(wallet?.totalWithdrawals || 0).toLocaleString()}</span>
                      </TableCell>

                      {/* Joining Date */}
                      <TableCell>
                        <span className="text-sm">{new Date(user.registrationDate).toLocaleDateString()}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found matching your search criteria.
          </div>
        )}
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Phone</Label>
                  <Input
                    id="mobile"
                    value={editingUser.mobile || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="txnPin">TXN Pin</Label>
                  <Input
                    id="txnPin"
                    value={editingUser.txnPin || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, txnPin: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="packageAmount">Package Amount</Label>
                  <Input
                    id="packageAmount"
                    type="number"
                    value={editingUser.packageAmount}
                    onChange={(e) => setEditingUser({ ...editingUser, packageAmount: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="cryptoWalletAddress">Crypto Wallet Address</Label>
                  <Input
                    id="cryptoWalletAddress"
                    value={editingUser.cryptoWalletAddress || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, cryptoWalletAddress: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={editingUser.status} 
                    onValueChange={(value: 'active' | 'inactive' | 'pending') => 
                      setEditingUser({ ...editingUser, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Blocked</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}