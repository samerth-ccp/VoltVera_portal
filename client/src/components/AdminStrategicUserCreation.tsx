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

import { 
  UserPlus,
  Link2,
  Copy,
  RefreshCw
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

interface ReferralFormData {
  placementType: 'strategic' | 'auto' | 'root';
  placementSide: 'left' | 'right';
  parentId: string; // Add parent user selection
}

export function AdminReferralLinkGeneration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [referralFormData, setReferralFormData] = useState<ReferralFormData>({
    placementType: 'strategic',
    placementSide: 'left',
    parentId: ''
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



  // Generate referral link
  const generateReferralLink = async () => {
    setIsGeneratingLink(true);
    try {
      const payload: any = {
        placementType: referralFormData.placementType,
        placementSide: referralFormData.placementSide
      };
      
      // Only include parentId for strategic placement
      if (referralFormData.placementType === 'strategic') {
        payload.parentId = referralFormData.parentId;
      }
      
      const response = await apiRequest('POST', '/api/referral/generate', payload);

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



  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: "Copied",
      description: "Referral link copied to clipboard",
    });
  };

  const resetForms = () => {
    setReferralFormData({
      placementType: 'strategic',
      placementSide: 'left',
      parentId: ''
    });
    setGeneratedLink('');
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
            <Link2 className="h-5 w-5 text-blue-500" />
            Generate Referral Link
          </CardTitle>
          <p className="text-sm text-gray-600">
            Create a referral link for strategic user placement
          </p>
        </DialogHeader>

        {/* Referral Link Generation - Single Flow */}
        <div className="space-y-6">
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
                      <Label htmlFor="placementType">Placement Type *</Label>
                      <Select
                        value={referralFormData.placementType}
                        onValueChange={(value: 'strategic' | 'auto' | 'root') => setReferralFormData(prev => ({ ...prev, placementType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strategic">Strategic Placement (Choose Parent + Position)</SelectItem>
                          <SelectItem value="auto">Auto Placement (System Finds Best Position)</SelectItem>
                          <SelectItem value="root">Root Placement (Top Level of Tree)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose how you want to place the new user in the MLM tree
                      </p>
                    </div>

                    {referralFormData.placementType === 'strategic' && (
                      <div>
                        <Label htmlFor="referralParent">Parent User *</Label>
                      <Select
                        value={referralFormData.parentId}
                        onValueChange={(value: string) => setReferralFormData(prev => ({ ...prev, parentId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent user for placement" />
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
                        Choose the parent user under whom the new user will be placed
                      </p>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="referralPlacement">Placement Side *</Label>
                      <Select
                        value={referralFormData.placementSide}
                        onValueChange={(value: 'left' | 'right') => setReferralFormData(prev => ({ ...prev, placementSide: value }))}
                        disabled={referralFormData.placementType === 'strategic' && !referralFormData.parentId}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {referralFormData.placementType === 'strategic' && referralFormData.parentId && getAvailablePositions(referralFormData.parentId).left && (
                            <SelectItem value="left">Left Side</SelectItem>
                          )}
                          {referralFormData.placementType === 'strategic' && referralFormData.parentId && getAvailablePositions(referralFormData.parentId).right && (
                            <SelectItem value="right">Right Side</SelectItem>
                          )}
                          {referralFormData.placementType === 'auto' && (
                            <>
                              <SelectItem value="left">Left Side (Auto-find best position)</SelectItem>
                              <SelectItem value="right">Right Side (Auto-find best position)</SelectItem>
                            </>
                          )}
                          {referralFormData.placementType === 'root' && (
                            <>
                              <SelectItem value="left">Left Side (Root level)</SelectItem>
                              <SelectItem value="right">Right Side (Root level)</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose which side of the binary tree this user will be placed on
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isGeneratingLink || (referralFormData.placementType === 'strategic' && !referralFormData.parentId)}
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
                      
                      {referralFormData.placementType === 'strategic' && (
                        <>
                          <p>🎯 Strategic placement: <strong>{referralFormData.parentId ? `Under ${usersForPlacement.find(u => u.id === referralFormData.parentId)?.firstName || 'Selected User'}` : 'No parent selected'}</strong></p>
                          <p>📍 Placement side: <strong>{referralFormData.placementSide === 'left' ? 'Left' : 'Right'}</strong></p>
                        </>
                      )}
                      
                      {referralFormData.placementType === 'auto' && (
                        <p>🎯 Auto placement: <strong>System will find best available position in tree</strong></p>
                      )}
                      
                      {referralFormData.placementType === 'root' && (
                        <p>🎯 Root placement: <strong>User will be placed at top level of tree</strong></p>
                      )}
                      
                      <p>🔗 Referral token: <code className="text-xs bg-gray-100 px-1 rounded">{generatedLink.split('ref=')[1]}</code></p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>

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
