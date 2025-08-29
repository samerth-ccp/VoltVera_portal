import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import { Clock, User, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

export default function PendingUserDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch user profile data
  const { data: profile } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/user/profile', data);
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    updateProfileMutation.mutate(data);
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <VoltverashopLogo size="large" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <VoltverashopLogo className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome, {profile.firstName}!</h1>
              <p className="text-white/70">User ID: {profile.userId}</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="bg-white/10 border-white/20 text-white">
            Logout
          </Button>
        </div>

        {/* Status Banner */}
        <Card className="bg-yellow-900/30 border-yellow-400/30 mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-300">Account Pending Approval</h3>
                <p className="text-yellow-200/80">
                  Your account has been created successfully! Our admin team is reviewing your registration details.
                  You'll receive full access once approved.
                </p>
              </div>
              <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Account Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white mb-1">Registration Status</h3>
              <p className="text-yellow-300">Under Review</p>
            </CardContent>
          </Card>
          
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white mb-1">KYC Status</h3>
              <p className="text-blue-300">{profile.kycStatus === 'pending' ? 'Submitted' : 'Approved'}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-6 text-center">
              <User className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white mb-1">Profile</h3>
              <p className="text-green-300">Complete</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Information */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center">
                  <User className="mr-2 h-5 w-5 text-green-400" />
                  Your Profile Information
                </CardTitle>
                <CardDescription className="text-white/60">
                  Review and update your personal information as needed
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                className="bg-white/10 border-white/20 text-white"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">First Name</Label>
                    <Input 
                      name="firstName"
                      defaultValue={profile.firstName || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Last Name</Label>
                    <Input 
                      name="lastName"
                      defaultValue={profile.lastName || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Mobile</Label>
                    <Input 
                      name="mobile"
                      defaultValue={profile.mobile || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Email</Label>
                    <Input 
                      name="email"
                      defaultValue={profile.email || ''}
                      className="bg-black/50 border-white/20 text-white"
                      disabled
                    />
                  </div>
                  <div>
                    <Label className="text-white">Address</Label>
                    <Input 
                      name="address"
                      defaultValue={profile.address || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">City</Label>
                    <Input 
                      name="city"
                      defaultValue={profile.city || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">State</Label>
                    <Input 
                      name="state"
                      defaultValue={profile.state || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Pincode</Label>
                    <Input 
                      name="pincode"
                      defaultValue={profile.pincode || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                </div>
                <Separator className="bg-white/20" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Bank Name</Label>
                    <Input 
                      name="bankName"
                      defaultValue={profile.bankName || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Bank Account Number</Label>
                    <Input 
                      name="bankAccountNumber"
                      defaultValue={profile.bankAccountNumber || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Bank IFSC</Label>
                    <Input 
                      name="bankIFSC"
                      defaultValue={profile.bankIFSC || ''}
                      className="bg-black/50 border-white/20 text-white"
                    />
                  </div>
                </div>
                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="bg-white/10 border-white/20 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/60">First Name</Label>
                    <p className="text-white">{profile.firstName || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Last Name</Label>
                    <p className="text-white">{profile.lastName || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Mobile</Label>
                    <p className="text-white">{profile.mobile || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Email</Label>
                    <p className="text-white">{profile.email}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Address</Label>
                    <p className="text-white">{profile.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">City</Label>
                    <p className="text-white">{profile.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">State</Label>
                    <p className="text-white">{profile.state || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Pincode</Label>
                    <p className="text-white">{profile.pincode || 'Not provided'}</p>
                  </div>
                </div>
                <Separator className="bg-white/20" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/60">Bank Name</Label>
                    <p className="text-white">{profile.bankName || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Bank Account Number</Label>
                    <p className="text-white">{profile.bankAccountNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-white/60">Bank IFSC</Label>
                    <p className="text-white">{profile.bankIFSC || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What's Next Section */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-400" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-white/80">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Admin Review</p>
                  <p className="text-sm text-white/60">Our team will verify your submitted documents and information</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Account Activation</p>
                  <p className="text-sm text-white/60">Once approved, your account will be activated with full access</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">MLM Access</p>
                  <p className="text-sm text-white/60">You'll gain access to your team dashboard, earnings, and all MLM features</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}