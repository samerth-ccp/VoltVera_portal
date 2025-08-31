import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, CheckCircle, XCircle, DollarSign, Eye, FileText, CreditCard, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { RejectRecruitDialog } from "./RejectRecruitDialog";

interface PendingRecruit {
  id: string;
  email: string;
  fullName: string;
  mobile?: string;
  recruiterId: string;
  packageAmount: string;
  position: string;
  status: string;
  uplineDecision: string;
  uplineDecisionAt: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Comprehensive registration data
  password?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankIFSC?: string;
  bankName?: string;
  panCardUrl?: string;
  aadhaarCardUrl?: string;
  bankStatementUrl?: string;
  profileImageUrl?: string;
}

export function AdminPendingRecruits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecruit, setSelectedRecruit] = useState<PendingRecruit | null>(null);
  const [packageAmount, setPackageAmount] = useState("0.00");
  const [position, setPosition] = useState("Left");
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [rejectDialogRecruit, setRejectDialogRecruit] = useState<PendingRecruit | null>(null);
  const [detailsRecruit, setDetailsRecruit] = useState<PendingRecruit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch pending recruits
  const { data: pendingRecruits = [], isLoading } = useQuery<PendingRecruit[]>({
    queryKey: ["/api/admin/pending-recruits"],
  });

  // Approve recruit mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, packageAmount, position }: { id: string; packageAmount: string; position?: string }) => {
      const payload: any = { packageAmount };
      // Only include position if it's not already decided by upline
      if (position && selectedRecruit?.uplineDecision !== 'approved') {
        payload.position = position;
      }
      const response = await apiRequest('POST', `/api/admin/pending-recruits/${id}/approve`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-recruits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsApproveOpen(false);
      setSelectedRecruit(null);
      toast({
        title: "Recruit approved",
        description: "User account created successfully and credentials will be sent",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve recruit",
        variant: "destructive",
      });
    },
  });

  // Note: Reject functionality is now handled by RejectRecruitDialog

  const handleApprove = (recruit: PendingRecruit) => {
    setSelectedRecruit(recruit);
    setPackageAmount("0.00");
    // Set position to existing position if already decided by upline
    setPosition(recruit.uplineDecision === 'approved' ? recruit.position : "Left");
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = () => {
    if (!selectedRecruit) return;
    approveMutation.mutate({
      id: selectedRecruit.id,
      packageAmount,
      position
    });
  };

  const handleReject = (recruit: PendingRecruit) => {
    setRejectDialogRecruit(recruit);
  };

  const handleViewDetails = (recruit: PendingRecruit) => {
    setDetailsRecruit(recruit);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Recruits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading pending recruits...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Pending Recruits ({pendingRecruits.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRecruits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending recruits to process
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRecruits.map((recruit) => (
              <div key={recruit.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {recruit.fullName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{recruit.email}</p>
                      {recruit.mobile && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">{recruit.mobile}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
                      {recruit.status}
                    </Badge>
                    {recruit.uplineDecision === 'approved' && (
                      <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                        {recruit.position} Position (Upline Decided)
                      </Badge>
                    )}
                    <span>
                      Submitted {formatDistanceToNow(new Date(recruit.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(recruit)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(recruit)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(recruit)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Recruit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRecruit && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold">{selectedRecruit.fullName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRecruit.email}</p>
                  {selectedRecruit.uplineDecision === 'approved' && (
                    <div className="mt-2">
                      <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                        Position: {selectedRecruit.position} (Strategically chosen by upline)
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="packageAmount">Package Amount ($)</Label>
                <Input
                  id="packageAmount"
                  type="text"
                  value={packageAmount}
                  onChange={(e) => setPackageAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              {/* Only show position selector if upline hasn't decided */}
              {selectedRecruit?.uplineDecision !== 'approved' && (
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Left">Left</SelectItem>
                      <SelectItem value="Right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleApproveSubmit}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  {approveMutation.isPending ? "Processing..." : "Approve & Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <RejectRecruitDialog
          isOpen={rejectDialogRecruit !== null}
          onClose={() => setRejectDialogRecruit(null)}
          recruitId={rejectDialogRecruit?.id || ""}
          recruitName={rejectDialogRecruit?.fullName || ""}
        />

        {/* Details View Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Complete Registration Details
              </DialogTitle>
            </DialogHeader>
            {detailsRecruit && (
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                        <p className="font-medium">{detailsRecruit.fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <p className="font-medium">{detailsRecruit.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Mobile</Label>
                        <p className="font-medium">{detailsRecruit.mobile || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                        <p className="font-medium">
                          {detailsRecruit.dateOfBirth 
                            ? new Date(detailsRecruit.dateOfBirth).toLocaleDateString() 
                            : 'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Address</Label>
                        <p className="font-medium text-sm">
                          {detailsRecruit.address && detailsRecruit.city && detailsRecruit.state
                            ? `${detailsRecruit.address}, ${detailsRecruit.city}, ${detailsRecruit.state} - ${detailsRecruit.pincode}`
                            : 'Address not provided'
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* KYC Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        KYC Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">PAN Number</Label>
                        <p className="font-medium">{detailsRecruit.panNumber || 'Not provided'}</p>
                        {detailsRecruit.panCardUrl && (
                          <Button variant="outline" size="sm" asChild className="mt-1">
                            <a href={detailsRecruit.panCardUrl} target="_blank" rel="noopener noreferrer">
                              View PAN Card
                            </a>
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Aadhaar Number</Label>
                        <p className="font-medium">{detailsRecruit.aadhaarNumber || 'Not provided'}</p>
                        {detailsRecruit.aadhaarCardUrl && (
                          <Button variant="outline" size="sm" asChild className="mt-1">
                            <a href={detailsRecruit.aadhaarCardUrl} target="_blank" rel="noopener noreferrer">
                              View Aadhaar Card
                            </a>
                          </Button>
                        )}
                      </div>
                      {detailsRecruit.profileImageUrl && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Profile Photo</Label>
                          <div className="mt-1">
                            <Button variant="outline" size="sm" asChild>
                              <a href={detailsRecruit.profileImageUrl} target="_blank" rel="noopener noreferrer">
                                View Profile Photo
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Bank Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Bank Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Bank Name</Label>
                      <p className="font-medium">{detailsRecruit.bankName || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Account Number</Label>
                      <p className="font-medium">{detailsRecruit.bankAccountNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">IFSC Code</Label>
                      <p className="font-medium">{detailsRecruit.bankIFSC || 'Not provided'}</p>
                    </div>
                    {detailsRecruit.bankStatementUrl && (
                      <div className="md:col-span-3">
                        <Label className="text-sm font-medium text-gray-500">Bank Statement</Label>
                        <div className="mt-1">
                          <Button variant="outline" size="sm" asChild>
                            <a href={detailsRecruit.bankStatementUrl} target="_blank" rel="noopener noreferrer">
                              View Bank Statement
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Registration Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Registration Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <Badge variant="outline" className="mt-1 border-blue-300 text-blue-700">
                        {detailsRecruit.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Submitted</Label>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(detailsRecruit.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {detailsRecruit.uplineDecision === 'approved' && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Position Decision</Label>
                          <Badge variant="outline" className="mt-1 border-green-300 text-green-700">
                            {detailsRecruit.position} Position (Upline Decided)
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Position Decided At</Label>
                          <p className="font-medium">
                            {detailsRecruit.uplineDecisionAt 
                              ? formatDistanceToNow(new Date(detailsRecruit.uplineDecisionAt), { addSuffix: true })
                              : 'Recently'
                            }
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Recruiter ID</Label>
                      <p className="font-medium">{detailsRecruit.recruiterId}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Package Amount</Label>
                      <p className="font-medium">${detailsRecruit.packageAmount}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleApprove(detailsRecruit);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve This Application
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleReject(detailsRecruit);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject This Application
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}