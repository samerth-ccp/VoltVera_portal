import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Plus, 
  TreePine, 
  UserPlus,
  MapPin,
  Crown,
  Link2,
  Copy,
  RefreshCw,
  Mail
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface UserForPlacement {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  level: string | null;
  position: string | null;
  leftChildId: string | null;
  rightChildId: string | null;
}

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  packageAmount: string;
  parentId: string;
  position: 'left' | 'right';
  sponsorId: string;
}

interface ReferralFormData {
  placementSide: 'left' | 'right';
}

export function AdminStrategicUserCreation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('referral');
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    mobile: '',
    packageAmount: '0.00',
    parentId: '',
    position: 'left',
    sponsorId: ''
  });
  const [referralFormData, setReferralFormData] = useState<ReferralFormData>({
    placementSide: 'left'
  });
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Fetch all users for parent selection
  const { data: usersForPlacement = [], isLoading: usersLoading } = useQuery<UserForPlacement[]>({
    queryKey: ["/api/admin/users-for-placement"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users-for-placement');
      return response.json();
    },
  });

  // Create user with strategic placement
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await apiRequest('POST', '/api/admin/users/create-with-placement', data);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-for-placement"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      toast({
        title: "User created successfully!",
        description: `User ${result.user.email} placed under ${result.placement.parentId} at ${result.placement.position} position`,
      });
      
      setIsOpen(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        mobile: '',
        packageAmount: '0.00',
        parentId: '',
        position: 'left',
        sponsorId: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating user",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Generate referral link
  const generateReferralLink = async () => {
    setIsGeneratingLink(true);
    try {
      const response = await apiRequest('POST', '/api/referral/generate', {
        placementSide: referralFormData.placementSide
      });

      const data = await response.json();
      
      if (data.url) {
        setGeneratedLink(data.url);
        toast({
          title: "Success",
          description: "Referral link generated successfully",
        });
      } else {
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
      setIsGeneratingLink(false);
    }
  };

  const handleStrategicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.parentId) {
      toast({
        title: "Parent selection required",
        description: "Please select a parent user for placement",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(formData);
  };

  const handleReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateReferralLink();
  };

  const getAvailablePositions = (userId: string) => {
    const user = usersForPlacement.find(u => u.id === userId);
    if (!user) return { left: false, right: false };
    
    return {
      left: !user.leftChildId,
      right: !user.rightChildId
    };
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: "Copied",
      description: "Referral link copied to clipboard",
    });
  };

  const resetForms = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      mobile: '',
      packageAmount: '0.00',
      parentId: '',
      position: 'left',
      sponsorId: ''
    });
    setReferralFormData({
      placementSide: 'left'
    });
    setGeneratedLink('');
    setActiveTab('referral');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="volt-gradient text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Unified User Creation
          </CardTitle>
          <p className="text-sm text-gray-600">
            Choose between referral link generation or strategic placement
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="referral" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Referral Link
            </TabsTrigger>
            <TabsTrigger value="strategic" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Strategic Placement
            </TabsTrigger>
          </TabsList>

          {/* Referral Link Tab - Priority Flow */}
          <TabsContent value="referral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-blue-500" />
                  Generate Referral Link
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Create a referral link for new users to register themselves
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReferralSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="referralPlacement">Placement Side *</Label>
                      <Select
                        value={referralFormData.placementSide}
                        onValueChange={(value: 'left' | 'right') => setReferralFormData(prev => ({ ...prev, placementSide: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left Side</SelectItem>
                          <SelectItem value="right">Right Side</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose which side of the binary tree this user will be placed on
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isGeneratingLink}
                    className="w-full volt-gradient text-white"
                  >
                    {isGeneratingLink ? (
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
                </form>

                {generatedLink && (
                  <div className="mt-6 space-y-3 p-4 bg-gray-50 rounded-lg">
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
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>⏰ Link expires in 48 hours</p>
                      <p>📧 User will fill registration form with their details and await admin approval</p>
                      <p>✅ Review and approve from "Pending Recruits" section</p>
                      <p>🎯 Placement side is pre-selected: <strong>{referralFormData.placementSide === 'left' ? 'Left' : 'Right'}</strong></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Strategic Placement Tab */}
          <TabsContent value="strategic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="password"
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter password"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generatePassword}
                        className="shrink-0"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="packageAmount">Package Amount</Label>
                    <Input
                      id="packageAmount"
                      type="number"
                      value={formData.packageAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, packageAmount: e.target.value }))}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Strategic Placement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="parentId">Parent User *</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        parentId: value,
                        sponsorId: value // Default sponsor to parent
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent user" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersLoading ? (
                        <SelectItem value="" disabled>Loading users...</SelectItem>
                      ) : (
                        usersForPlacement.map((user) => {
                          const positions = getAvailablePositions(user.id);
                          const hasOpenPositions = positions.left || positions.right;
                          
                          return (
                            <SelectItem 
                              key={user.id} 
                              value={user.id}
                              disabled={!hasOpenPositions}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>
                                  {user.userId} - {user.firstName} {user.lastName}
                                </span>
                                <div className="flex gap-1 ml-2">
                                  {positions.left && <Badge variant="outline" className="text-xs">L</Badge>}
                                  {positions.right && <Badge variant="outline" className="text-xs">R</Badge>}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    L = Left position available, R = Right position available
                  </p>
                </div>

                {formData.parentId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">Position *</Label>
                      <Select
                        value={formData.position}
                        onValueChange={(value: 'left' | 'right') => setFormData(prev => ({ ...prev, position: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailablePositions(formData.parentId).left && (
                            <SelectItem value="left">Left Position</SelectItem>
                          )}
                          {getAvailablePositions(formData.parentId).right && (
                            <SelectItem value="right">Right Position</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="sponsorId">Sponsor ID</Label>
                      <Input
                        id="sponsorId"
                        value={formData.sponsorId}
                        onChange={(e) => setFormData(prev => ({ ...prev, sponsorId: e.target.value }))}
                        placeholder="Leave empty to use parent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Usually same as parent, but can be different
                      </p>
                    </div>
                  </div>
                )}

                {/* Tree Preview */}
                {formData.parentId && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Placement Preview:</p>
                    <div className="text-sm text-gray-600">
                      <p>• User will be placed under: <strong>{usersForPlacement.find(u => u.id === formData.parentId)?.firstName} {usersForPlacement.find(u => u.id === formData.parentId)?.lastName}</strong></p>
                      <p>• Position: <strong>{formData.position === 'left' ? 'Left' : 'Right'}</strong></p>
                      <p>• Level: <strong>{parseInt(usersForPlacement.find(u => u.id === formData.parentId)?.level || '0') + 1}</strong></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={createUserMutation.isPending || !formData.parentId}
              className="w-full volt-gradient text-white"
              onClick={handleStrategicSubmit}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User with Strategic Placement"}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              resetForms();
            }}
          >
            Cancel
          </Button>
          {generatedLink && (
            <Button 
              onClick={() => {
                copyToClipboard();
                setIsOpen(false);
                resetForms();
              }}
              className="volt-gradient text-white"
            >
              Copy & Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
