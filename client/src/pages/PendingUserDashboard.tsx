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
import { Clock, User, FileText, AlertCircle, CheckCircle, Download, Eye, MessageSquare, Camera, CreditCard, Building, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";

export default function PendingUserDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [replacingDocument, setReplacingDocument] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentNumber, setDocumentNumber] = useState('');

  // Fetch user profile data
  const { data: profile } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user
  });

  // Fetch KYC documents
  const { data: kycDocuments = [] } = useQuery({
    queryKey: ['/api/kyc'],
    enabled: !!user
  });

  // Fetch user notifications/messages
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
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

  // Upload file mutation for document replacement
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Get presigned upload URL from backend
      const uploadResponse = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await uploadResponse.json();

      // Step 2: Upload file directly to object storage using presigned URL
      const uploadRequest = new XMLHttpRequest();
      
      return new Promise<string>((resolve, reject) => {
        uploadRequest.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        };

        uploadRequest.onload = () => {
          if (uploadRequest.status >= 200 && uploadRequest.status < 300) {
            resolve(uploadURL);
          } else {
            reject(new Error(`Upload failed with status ${uploadRequest.status}`));
          }
        };

        uploadRequest.onerror = () => {
          reject(new Error('Upload failed'));
        };

        uploadRequest.open('PUT', uploadURL);
        uploadRequest.setRequestHeader('Content-Type', file.type);
        uploadRequest.send(file);
      });
    },
    onError: () => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Replace document mutation
  const replaceDocumentMutation = useMutation({
    mutationFn: async ({ documentId, documentUrl, documentNumber }: { 
      documentId: string;
      documentUrl: string;
      documentNumber?: string;
    }) => {
      const response = await apiRequest('PUT', `/api/kyc/${documentId}`, {
        documentType: replacingDocument?.documentType,
        documentUrl,
        documentNumber,
      });
      return response.json();
    },
    onSuccess: () => {
      setReplacingDocument(null);
      setSelectedFile(null);
      setUploadProgress(0);
      setDocumentNumber('');
      queryClient.invalidateQueries({ queryKey: ['/api/kyc'] });
      toast({
        title: "Document Replaced",
        description: "Your document has been replaced successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Replacement Failed",
        description: error.message || "Failed to replace document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReplaceDocument = async () => {
    if (!selectedFile || !replacingDocument) return;

    try {
      // Upload file first
      const rawUploadUrl = await uploadMutation.mutateAsync(selectedFile);
      
      // Convert the upload URL to object storage path format
      let documentUrl = rawUploadUrl;
      if (rawUploadUrl.startsWith('https://storage.googleapis.com/')) {
        const url = new URL(rawUploadUrl);
        const pathParts = url.pathname.split('/');
        if (pathParts.length >= 4) {
          const objectPath = pathParts.slice(3).join('/');
          documentUrl = `/objects/${objectPath}`;
        }
      }
      
      // Replace the document
      await replaceDocumentMutation.mutateAsync({
        documentId: replacingDocument.id,
        documentUrl,
        documentNumber: documentNumber || undefined,
      });
    } catch (error) {
      console.error('Document replacement error:', error);
    }
  };

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

        {/* Uploaded Documents Section */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-400" />
              Your Uploaded Documents
            </CardTitle>
            <CardDescription className="text-white/60">
              View your submitted KYC documents and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kycDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white/60">No documents uploaded yet</p>
                <p className="text-white/40 text-sm">Upload your KYC documents to complete verification</p>
              </div>
            ) : (
              <div className="space-y-4">
                {kycDocuments.map((doc: any) => {
                  const getDocumentIcon = (type: string) => {
                    switch(type) {
                      case 'pan': return CreditCard;
                      case 'aadhaar': return FileText;
                      case 'bank_statement': return Building;
                      case 'photo': return Camera;
                      default: return FileText;
                    }
                  };

                  const getDocumentLabel = (type: string) => {
                    switch(type) {
                      case 'pan': return 'PAN Card';
                      case 'aadhaar': return 'Aadhaar Card';
                      case 'bank_statement': return 'Bank Statement';
                      case 'photo': return 'Photo ID';
                      default: return type;
                    }
                  };

                  const getStatusBadge = (status: string) => {
                    switch(status) {
                      case 'approved':
                        return <Badge className="bg-green-500/20 text-green-300 border-green-400/30">Approved</Badge>;
                      case 'rejected':
                        return <Badge className="bg-red-500/20 text-red-300 border-red-400/30">Rejected</Badge>;
                      default:
                        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">Under Review</Badge>;
                    }
                  };

                  const IconComponent = getDocumentIcon(doc.documentType);

                  return (
                    <div key={doc.id} className="border border-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <IconComponent className="h-8 w-8 text-blue-400" />
                          <div>
                            <h3 className="font-semibold text-white">{getDocumentLabel(doc.documentType)}</h3>
                            {doc.documentNumber && (
                              <p className="text-sm text-white/60">Number: {doc.documentNumber}</p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white/60">
                          <p>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</p>
                          {doc.reviewedAt && (
                            <p>Reviewed: {new Date(doc.reviewedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              // Convert document URL to proper API endpoint
                              let viewUrl = doc.documentUrl;
                              if (viewUrl.startsWith('https://storage.googleapis.com/documents/')) {
                                const filename = viewUrl.split('/').pop();
                                viewUrl = `/api/documents/${filename}`;
                              } else if (!viewUrl.startsWith('/api/')) {
                                viewUrl = doc.documentUrl; // Keep as-is for other formats
                              }
                              window.open(viewUrl, '_blank');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => {
                              // Convert document URL to proper API endpoint
                              let downloadUrl = doc.documentUrl;
                              if (downloadUrl.startsWith('https://storage.googleapis.com/documents/')) {
                                const filename = downloadUrl.split('/').pop();
                                downloadUrl = `/api/documents/${filename}`;
                              } else if (!downloadUrl.startsWith('/api/')) {
                                downloadUrl = doc.documentUrl; // Keep as-is for other formats
                              }
                              
                              const link = document.createElement('a');
                              link.href = downloadUrl;
                              link.download = `${getDocumentLabel(doc.documentType)}_${doc.documentNumber || 'document'}`;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {doc.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-orange-500/20 border-orange-400/30 text-orange-300 hover:bg-orange-500/30"
                              onClick={() => setReplacingDocument(doc)}
                              data-testid={`button-replace-${doc.documentType}`}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Replace
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {doc.status === 'rejected' && doc.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-900/30 border border-red-400/30 rounded-md">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-red-300 font-medium">Admin Feedback</p>
                              <p className="text-red-200 text-sm mt-1">{doc.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 mt-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-purple-400" />
                Notifications
              </CardTitle>
              <CardDescription className="text-white/60">
                Important updates and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification: any) => (
                  <div key={notification.id} className="border border-white/10 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <MessageSquare className="h-6 w-6 text-purple-400 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">{notification.subject}</h3>
                          <Badge variant="outline" className="text-xs">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-white/80">{notification.content}</p>
                        {notification.priority === 'high' && (
                          <div className="flex items-center space-x-2 mt-2">
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <span className="text-red-300 text-sm font-medium">High Priority</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Document Replacement Dialog */}
        <Dialog open={!!replacingDocument} onOpenChange={(open) => !open && setReplacingDocument(null)}>
          <DialogContent className="sm:max-w-md bg-black/90 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">Replace Document</DialogTitle>
              <DialogDescription className="text-white/70">
                Replace your rejected {replacingDocument?.documentType} document
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="replacement-file" className="text-white">Select New Document</Label>
                <Input
                  id="replacement-file"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-replacement-file"
                />
              </div>
              <div>
                <Label htmlFor="replacement-number" className="text-white">
                  Document Number (Optional)
                </Label>
                <Input
                  id="replacement-number"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Enter document number if applicable"
                  className="bg-white/10 border-white/20 text-white placeholder-white/40"
                  data-testid="input-replacement-number"
                />
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setReplacingDocument(null)}
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="button-cancel-replace"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReplaceDocument}
                  disabled={!selectedFile || uploadMutation.isPending || replaceDocumentMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-confirm-replace"
                >
                  {uploadMutation.isPending || replaceDocumentMutation.isPending ? 'Replacing...' : 'Replace Document'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}