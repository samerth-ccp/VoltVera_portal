import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, User as UserIcon, Clock, AlertCircle, FileText, Users, UserPlus } from "lucide-react";
import type { User, PendingRecruit } from "@shared/schema";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending-users");

  // Fetch pending users
  const { data: pendingUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users/pending'],
    enabled: true,
  });

  // Fetch pending recruits  
  const { data: pendingRecruits, isLoading: loadingRecruits } = useQuery({
    queryKey: ['/api/admin/pending-recruits'],
    enabled: true,
  });

  const handleApproveUser = async (userId: string) => {
    try {
      await apiRequest('/api/users/approve', {
        method: 'POST',
        body: { userId }
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/pending'] });
      
      toast({
        title: "Success",
        description: "User approved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await apiRequest('/api/users/reject', {
        method: 'POST', 
        body: { userId }
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/pending'] });
      
      toast({
        title: "Success",
        description: "User rejected successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const handleApproveRecruit = async (id: string) => {
    try {
      await apiRequest(`/api/admin/pending-recruits/${id}/approve`, {
        method: 'POST'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-recruits'] });
      
      toast({
        title: "Success",
        description: "Recruit approved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve recruit",
        variant: "destructive",
      });
    }
  };

  const handleRejectRecruit = async (id: string) => {
    try {
      await apiRequest(`/api/admin/pending-recruits/${id}/reject`, {
        method: 'DELETE'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-recruits'] });
      
      toast({
        title: "Success", 
        description: "Recruit rejected successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject recruit",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage pending users and recruit approvals</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending-users" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Pending Users
            {pendingUsers && (
              <Badge variant="secondary" className="ml-1">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending-recruits" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Pending Recruits
            {pendingRecruits && (
              <Badge variant="secondary" className="ml-1">
                {pendingRecruits.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending-users" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Pending Users
              </CardTitle>
              <CardDescription>
                Users awaiting admin approval to access full platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">Loading...</div>
              ) : !pendingUsers || pendingUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending users found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user: User) => (
                    <div key={user.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {user.firstName} {user.lastName}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {user.userId}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-sm text-gray-600">{user.mobile}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveUser(user.id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`button-approve-user-${user.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectUser(user.id)}
                            data-testid={`button-reject-user-${user.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Package:</span>
                          <p>₹{user.packageAmount}</p>
                        </div>
                        <div>
                          <span className="font-medium">Location:</span>
                          <p>{user.city}, {user.state}</p>
                        </div>
                        <div>
                          <span className="font-medium">Sponsor:</span>
                          <p>{user.sponsorId}</p>
                        </div>
                        <div>
                          <span className="font-medium">Registration:</span>
                          <p>{new Date(user.registrationDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-recruits" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Pending Recruits
              </CardTitle>
              <CardDescription>
                Recruitment requests awaiting admin approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRecruits ? (
                <div className="text-center py-8">Loading...</div>
              ) : !pendingRecruits || pendingRecruits.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending recruits found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRecruits.map((recruit: PendingRecruit) => (
                    <div key={recruit.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">
                            {recruit.firstName} {recruit.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{recruit.email}</p>
                          <p className="text-sm text-gray-600">{recruit.mobile}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleApproveRecruit(recruit.id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`button-approve-recruit-${recruit.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectRecruit(recruit.id)}
                            data-testid={`button-reject-recruit-${recruit.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Package:</span>
                          <p>₹{recruit.packageAmount}</p>
                        </div>
                        <div>
                          <span className="font-medium">Location:</span>
                          <p>{recruit.city}, {recruit.state}</p>
                        </div>
                        <div>
                          <span className="font-medium">Sponsor:</span>
                          <p>{recruit.sponsorId}</p>
                        </div>
                        <div>
                          <span className="font-medium">Position:</span>
                          <p className="capitalize">{recruit.desiredPosition}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}