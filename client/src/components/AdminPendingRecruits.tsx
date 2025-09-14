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
  recruiterRole?: string; // Role of the recruiter (admin, founder, user, etc.)
  packageAmount: string;
  position: string;
  status: string;
  uplineDecision: string;
  uplineDecisionAt: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Comprehensive registration data
  password?: string;
  nominee?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankIFSC?: string;
  bankName?: string;
  bankAccountHolderName?: string;
  panCardUrl?: string;
  aadhaarCardUrl?: string;
  bankStatementUrl?: string;
  profileImageUrl?: string;
}

interface KYCDocument {
  id: string;
  documentType: string;
  documentData: string;
  documentContentType: string;
  documentFilename: string;
  documentSize: number;
  documentNumber?: string;
  status: string;
  createdAt: string;
}

export function AdminPendingRecruits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecruit, setSelectedRecruit] = useState<PendingRecruit | null>(null);
  const [packageAmount, setPackageAmount] = useState("0.00");
  const [position, setPosition] = useState("Left");
  const [kycDecision, setKycDecision] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [rejectDialogRecruit, setRejectDialogRecruit] = useState<PendingRecruit | null>(null);
  const [detailsRecruit, setDetailsRecruit] = useState<PendingRecruit | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Fetch pending recruits
  const { data: pendingRecruits = [], isLoading } = useQuery<PendingRecruit[]>({
    queryKey: ["/api/admin/pending-recruits"],
  });

  // Approve recruit mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, packageAmount, position }: { id: string; packageAmount: string; position: string }) => {
      const payload: any = { packageAmount, position };
      // Always include position - admin can override upline decision
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

  // Fetch documents for a pending recruit
  const fetchDocuments = async (recruitId: string) => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`/api/admin/pending-recruits/${recruitId}/documents`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      } else {
        console.error('Failed to fetch documents:', response.statusText);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Handle viewing recruit details and fetch documents
  const handleViewDetails = (recruit: PendingRecruit) => {
    setDetailsRecruit(recruit);
    setIsDetailsOpen(true);
    fetchDocuments(recruit.id);
  };

  const handleApprove = (recruit: PendingRecruit) => {
    setSelectedRecruit(recruit);
    setPackageAmount("0.00");
    // Set position to existing position if already decided by upline, or default for admin-generated
    if (recruit.uplineDecision === 'approved' && recruit.position) {
      setPosition(recruit.position);
    } else if (recruit.recruiterRole === 'admin' || recruit.recruiterRole === 'founder') {
      setPosition("Left"); // Default position for admin-generated recruits
    } else {
      setPosition("Left"); // Default position for regular recruits
    }
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = () => {
    if (!selectedRecruit) return;
    
    const payload: any = {
      id: selectedRecruit.id,
      packageAmount,
      position
    };
    
    // Add KYC decision if provided
    if (kycDecision) {
      payload.kycDecision = {
        status: kycDecision,
        reason: kycDecision === 'rejected' ? rejectionReason : undefined
      };
    }
    
    approveMutation.mutate(payload);
  };

  const handleReject = (recruit: PendingRecruit) => {
    setRejectDialogRecruit(recruit);
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
                    {/* Status Badge - Show different colors based on status */}
                    <Badge 
                      variant="outline" 
                      className={
                        recruit.status === 'rejected' 
                          ? 'border-red-300 text-red-700 dark:border-red-600 dark:text-red-300'
                          : recruit.status === 'approved'
                          ? 'border-green-300 text-green-700 dark:border-green-600 dark:text-green-300'
                          : 'border-blue-300 text-blue-700 dark:text-blue-600 dark:text-blue-300'
                      }
                    >
                      {recruit.status}
                    </Badge>
                    
                    {/* Upline Decision Badge */}
                    {recruit.uplineDecision === 'approved' && (
                      <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                        {recruit.position} Position (Upline Decided)
                      </Badge>
                    )}
                    
                    {/* Admin Approval Badge - Show if recruit was generated by admin */}
                    {recruit.recruiterRole === 'admin' || recruit.recruiterRole === 'founder' ? (
                      <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300">
                        Admin Generated
                      </Badge>
                    ) : null}
                    
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
                  
                  {/* Show Approve button only if not already rejected */}
                  {recruit.status !== 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(recruit)}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  
                  {/* Show Reject button only if not already rejected */}
                  {recruit.status !== 'rejected' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(recruit)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}
                  
                  {/* Show status message if already rejected */}
                  {recruit.status === 'rejected' && (
                    <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-600 dark:text-red-300">
                      Already Rejected
                    </Badge>
                  )}
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
              
              {/* Show position selector for ALL recruits - admin can override upline decision */}
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
                {selectedRecruit?.uplineDecision === 'approved' && selectedRecruit?.position && (
                  <p className="text-xs text-gray-500">
                    Upline originally chose: {selectedRecruit.position}. You can change this if needed.
                  </p>
                )}
                {(selectedRecruit?.recruiterRole === 'admin' || selectedRecruit?.recruiterRole === 'founder') && (
                  <p className="text-xs text-gray-500">
                    Position required for admin-generated recruit
                  </p>
                )}
              </div>

              {/* KYC Decision Section */}
              <div className="space-y-2">
                <Label htmlFor="kycDecision">KYC Decision</Label>
                <Select value={kycDecision} onValueChange={(value: 'pending' | 'approved' | 'rejected') => setKycDecision(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose KYC decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending KYC</SelectItem>
                    <SelectItem value="approved">Approve KYC</SelectItem>
                    <SelectItem value="rejected">Reject KYC</SelectItem>
                  </SelectContent>
                </Select>
                {kycDecision === 'rejected' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Rejection Reason</Label>
                    <Input
                      id="rejectionReason"
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejection"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  This decision will be applied to the user's KYC profile after account creation.
                </p>
              </div>
              
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
                        <Label className="text-sm font-medium text-gray-500">Nominee</Label>
                        <p className="font-medium">{detailsRecruit.nominee || 'Not provided'}</p>
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
                        {/* Display PAN Card document if available */}
                        {documents.find(doc => doc.documentType === 'panCard') && (
                          <div className="mt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                                                             onClick={() => {
                                 const doc = documents.find(doc => doc.documentType === 'panCard');
                                 if (doc) {
                                   // Create a blob URL instead of data URL for better compatibility
                                   const byteCharacters = atob(doc.documentData);
                                   const byteNumbers = new Array(byteCharacters.length);
                                   for (let i = 0; i < byteCharacters.length; i++) {
                                     byteNumbers[i] = byteCharacters.charCodeAt(i);
                                   }
                                   const byteArray = new Uint8Array(byteNumbers);
                                   const blob = new Blob([byteArray], { type: doc.documentContentType });
                                   const blobUrl = URL.createObjectURL(blob);
                                   window.open(blobUrl, '_blank');
                                 }
                               }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View PAN Card
                            </Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Aadhaar Number</Label>
                        <p className="font-medium">{detailsRecruit.aadhaarNumber || 'Not provided'}</p>
                        {/* Display Aadhaar Card document if available */}
                        {documents.find(doc => doc.documentType === 'aadhaarCard') && (
                          <div className="mt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                const doc = documents.find(doc => doc.documentType === 'aadhaarCard');
                                if (doc) {
                                  // Create a blob URL instead of data URL for better compatibility
                                  const byteCharacters = atob(doc.documentData);
                                  const byteNumbers = new Array(byteCharacters.length);
                                  for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                  }
                                  const byteArray = new Uint8Array(byteNumbers);
                                  const blob = new Blob([byteArray], { type: doc.documentContentType });
                                  const blobUrl = URL.createObjectURL(blob);
                                  window.open(blobUrl, '_blank');
                                }
                              }}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Aadhaar Card
                            </Button>
                          </div>
                        )}
                      </div>
                      {/* Display Profile Photo document if available */}
                      {documents.find(doc => doc.documentType === 'photo') && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Profile Photo</Label>
                          <div className="mt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                                                             onClick={() => {
                                 const doc = documents.find(doc => doc.documentType === 'photo');
                                 if (doc) {
                                   // Create a blob URL instead of data URL for better compatibility
                                   const byteCharacters = atob(doc.documentData);
                                   const byteNumbers = new Array(byteCharacters.length);
                                   for (let i = 0; i < byteCharacters.length; i++) {
                                     byteNumbers[i] = byteCharacters.charCodeAt(i);
                                   }
                                   const byteArray = new Uint8Array(byteNumbers);
                                   const blob = new Blob([byteArray], { type: doc.documentContentType });
                                   const blobUrl = URL.createObjectURL(blob);
                                   window.open(blobUrl, '_blank');
                                 }
                               }}
                              className="text-pink-600 hover:text-pink-700"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Profile Photo
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Document Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Uploaded Documents ({documents.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingDocuments ? (
                        <div className="text-center py-4 text-gray-500">
                          Loading documents...
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No documents uploaded
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="font-medium capitalize">
                                  {doc.documentType.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                {doc.documentNumber && (
                                  <span className="text-sm text-gray-500">({doc.documentNumber})</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {Math.round(doc.documentSize / 1024)} KB
                              </div>
                            </div>
                          ))}
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
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Bank Name</Label>
                      <p className="font-medium">{detailsRecruit.bankName || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Account Holder Name</Label>
                      <p className="font-medium">{detailsRecruit.bankAccountHolderName || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Account Number</Label>
                      <p className="font-medium">{detailsRecruit.bankAccountNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">IFSC Code</Label>
                      <p className="font-medium">{detailsRecruit.bankIFSC || 'Not provided'}</p>
                    </div>
                    {/* Display Bank Statement document if available */}
                    {documents.find(doc => doc.documentType === 'bankStatement') && (
                      <div className="md:col-span-3">
                        <Label className="text-sm font-medium text-gray-500">Bank Statement</Label>
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                                                         onClick={() => {
                               const doc = documents.find(doc => doc.documentType === 'bankStatement');
                               if (doc) {
                                 // Create a blob URL instead of data URL for better compatibility
                                 const byteCharacters = atob(doc.documentData);
                                 const byteNumbers = new Array(byteCharacters.length);
                                 for (let i = 0; i < byteCharacters.length; i++) {
                                   byteNumbers[i] = byteCharacters.charCodeAt(i);
                                 }
                                 const byteArray = new Uint8Array(byteNumbers);
                                 const blob = new Blob([byteArray], { type: doc.documentContentType });
                                 const blobUrl = URL.createObjectURL(blob);
                                 window.open(blobUrl, '_blank');
                               }
                             }}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Bank Statement
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