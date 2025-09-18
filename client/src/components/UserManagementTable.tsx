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
  LogIn, 
  Edit, 
  UserX, 
  Eye, 
  EyeOff, 
  Copy,
  Download
} from "lucide-react";

interface User {
  id: string;
  userId?: string; // Login ID (e.g., VV0007)
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  sponsorId?: string;
  sponsorUserId?: string; // Sponsor's user ID (e.g., VV0001)
  packageAmount: string;
  cryptoWalletAddress?: string;
  txnPin?: string;
  password?: string; // Hashed password from backend
  originalPassword?: string; // Original password for admin viewing
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  activationDate?: string;
  // KYC fields
  kycStatus?: 'pending' | 'approved' | 'rejected';
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
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login as user mutation
  const loginAsUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log('Attempting to get impersonation code for user:', userId);
      const res = await apiRequest('POST', `/api/admin/login-as-user/${userId}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      console.log('Impersonation code received');
      toast({
        title: "Success",
        description: "Impersonation code issued",
      });
      // Open user dashboard in new window with one-time code
      const url = `/dashboard?impersonationCode=${encodeURIComponent(data.code)}`;
      window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes,noopener,noreferrer');
    },
    onError: (error: any) => {
      console.error('Failed to issue impersonation token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to issue impersonation token",
        variant: "destructive",
      });
    },
  });

  // Block/Unblock user mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}/status`, { status });
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
      return apiRequest('PATCH', `/api/admin/users/${userData.id}`, userData);
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

  // Users are already filtered by the server-side search in AdminDashboard
  const filteredUsers = users;

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
        user.sponsorUserId || '',
        user.packageAmount,
        user.cryptoWalletAddress || '',
        wallet?.balance || 0,
        wallet?.totalEarnings || 0,
        wallet?.totalWithdrawals || 0,
        withdrawal?.status || 'None',
        new Date(user.registrationDate).toLocaleDateString(),
        user.activationDate ? new Date(user.activationDate).toLocaleDateString() : ''
      ].join(',');
    });
    
    const headers = ['User ID', 'Name', 'Phone', 'Email', 'Password', 'TXN Pin', 'Sponsor User ID', 'Total Package', 'Wallet Address', 'E-wallet', 'Income', 'Total Withdraw', 'Withdraw Status', 'Registration Date', 'Activation Date'];
    const csv = [headers.join(','), ...csvData].join('\n');
    
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
      // Only send the fields that should be updated
      const updateData = {
        id: editingUser.id,
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        mobile: editingUser.mobile,
        txnPin: editingUser.txnPin,
        packageAmount: editingUser.packageAmount,
        cryptoWalletAddress: editingUser.cryptoWalletAddress,
        status: editingUser.status,
        password: editingUser.password, // Will be handled by server (removed if empty)
      };
      updateUserMutation.mutate(updateData);
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
        {/* User Management Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                  <TableHead className="min-w-[120px]">Withdraw Status</TableHead>
                  <TableHead className="min-w-[120px]">KYC Status</TableHead>
                  <TableHead className="min-w-[150px]">User ID</TableHead>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[150px]">Phone</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Password</TableHead>
                  <TableHead className="min-w-[120px]">TXN Pin</TableHead>
                  <TableHead className="min-w-[150px]">Sponsor User ID</TableHead>
                  <TableHead className="min-w-[130px]">Total Package</TableHead>
                  <TableHead className="min-w-[200px]">Wallet Address</TableHead>
                  <TableHead className="min-w-[120px]">E-wallet</TableHead>
                  <TableHead className="min-w-[120px]">Income</TableHead>
                  <TableHead className="min-w-[120px]">Total Withdraw</TableHead>
                  <TableHead className="min-w-[130px]">Registration Date</TableHead>
                  <TableHead className="min-w-[130px]">Activation Date</TableHead>
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
                            onClick={() => {
                              if (user.status !== 'active') {
                                toast({
                                  title: "Cannot Login",
                                  description: `Cannot login as user with status: ${user.status}. Only active users can be logged into.`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              loginAsUserMutation.mutate(user.id);
                            }}
                            disabled={loginAsUserMutation.isPending}
                            data-testid={`button-login-${user.id}`}
                            title={user.status !== 'active' ? `Cannot login as ${user.status} user` : "Login as this user"}
                            className={user.status !== 'active' ? 'opacity-50' : ''}
                          >
                            <LogIn className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(user)}
                            data-testid={`button-edit-${user.id}`}
                            title="Edit user details"
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
                            title={user.status === 'active' ? 'Block user' : 'Activate user'}
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

                      {/* KYC Status */}
                      <TableCell>
                        <Badge variant={
                          user.kycStatus === 'approved' ? 'success' :
                          user.kycStatus === 'rejected' ? 'destructive' :
                          user.kycStatus === 'pending' ? 'secondary' : 'outline'
                        }>
                          {user.kycStatus || 'Pending'}
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
                            title="Copy User ID"
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
                            {showPasswords[user.id] ? (user.originalPassword || user.password || 'Password not available') : '••••••••••••••'}
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

                      {/* Sponsor User ID */}
                      <TableCell>
                        <span className="font-mono text-sm">{user.sponsorUserId || '-'}</span>
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

                      {/* Registration Date */}
                      <TableCell>
                        <span className="text-sm">{new Date(user.registrationDate).toLocaleDateString()}</span>
                      </TableCell>

                      {/* Activation Date */}
                      <TableCell>
                        <span className="text-sm">
                          {user.activationDate ? new Date(user.activationDate).toLocaleDateString() : '-'}
                        </span>
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
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password (leave blank to keep current)"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  />
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