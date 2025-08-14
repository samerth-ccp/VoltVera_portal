import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@shared/schema";
import { Pencil, Trash2 } from "lucide-react";

interface DataTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onSearch: (search: string) => void;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase();
}

function getRoleBadgeVariant(role: string) {
  return role === 'admin' ? 'secondary' : 'outline';
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'inactive':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatLastActive(lastActiveAt: Date | null) {
  if (!lastActiveAt) return 'Never';
  
  const date = new Date(lastActiveAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Less than an hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString();
}

function getAvatarColor(index: number) {
  const colors = ['bg-volt-light', 'bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500'];
  return colors[index % colors.length];
}

export default function DataTable({ users, onEdit, onDelete, onSearch }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearch(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">All Users</h3>
        <div className="flex items-center space-x-4">
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">User</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.filter(user => {
              const matchesSearch = !search || 
                user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
                user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
                user.email?.toLowerCase().includes(search.toLowerCase());
              const matchesRole = roleFilter === 'all' || user.role === roleFilter;
              return matchesSearch && matchesRole;
            }).map((user, index) => (
              <TableRow key={user.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center">
                    <div className={`w-10 h-10 ${getAvatarColor(index)} rounded-full flex items-center justify-center text-white font-medium`}>
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)} className="capitalize">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {formatLastActive(user.lastActiveAt)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                      className="text-volt-dark hover:text-volt-light hover:bg-volt-light/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="text-red-600 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
