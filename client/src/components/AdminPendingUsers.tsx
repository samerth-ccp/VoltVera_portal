import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, User, Clock, AlertCircle, FileText } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function AdminPendingUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending users
  const { data: pendingUsers = [], isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/admin/pending-users"],
    queryFn: async () => {
      const response = await fetch('/api/admin/pending-users');
      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }
      return response.json();
    }
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User approved",
        description: "User account has been activated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  // Reject user mutation (optional - sets status to rejected)
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      toast({
        title: "User rejected",
        description: "User registration has been rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (userId: string) => {
    approveMutation.mutate(userId);
  };

  const handleReject = (userId: string) => {
    if (confirm("Are you sure you want to reject this user registration? This action cannot be undone.")) {
      rejectMutation.mutate(userId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-yellow-500" />
            Pending User Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading pending users...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5 text-yellow-500" />
          Pending User Approvals
          {pendingUsers.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
              {pendingUsers.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Review and approve new user registrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending user approvals at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt={user.firstName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm font-medium text-blue-600">
                          User ID: {user.userId}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Registration Date</p>
                        <p className="text-sm font-medium">
                          {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Package Amount</p>
                        <p className="text-sm font-medium">${user.packageAmount || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Sponsor</p>
                        <p className="text-sm font-medium">{user.sponsorId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Mobile</p>
                        <p className="text-sm font-medium">{user.mobile || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                        <p className="text-sm font-medium">
                          {user.city && user.state ? `${user.city}, ${user.state}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">KYC Status</p>
                        <Badge 
                          variant={user.kycStatus === 'pending' ? 'outline' : 'secondary'}
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {user.kycStatus || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Approval
                      </Badge>
                      <Badge variant="outline" className="border-blue-300 text-blue-700">
                        Position: {user.position}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${user.userId}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(user.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-reject-${user.userId}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}