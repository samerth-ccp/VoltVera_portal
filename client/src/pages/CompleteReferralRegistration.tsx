import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, CheckCircle, AlertCircle, Upload, FileText, Camera, CreditCard, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import { ObjectUploader } from "@/components/ObjectUploader";
import { completeUserRegistrationSchema } from "@shared/schema";
import type { z } from "zod";

type RegistrationFormData = z.infer<typeof completeUserRegistrationSchema>;

export default function CompleteReferralRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    panCardUrl?: string;
    aadhaarCardUrl?: string;
    bankStatementUrl?: string;
    photoUrl?: string;
  }>({});

  // Extract token from URL - check both 'ref' and 'token' parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const referralToken = urlParams.get('ref') || urlParams.get('token');
    if (referralToken) {
      setToken(referralToken);
    } else {
      toast({
        title: "Invalid Link",
        description: "This referral link is invalid or expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation('/'), 2000);
    }
  }, [toast, setLocation]);

  // Validate referral token
  const { data: tokenValidation, isLoading: isValidatingToken } = useQuery({
    queryKey: ['/api/referral/validate', token],
    queryFn: async () => {
      if (!token) return null;
      return apiRequest('GET', `/api/referral/validate?token=${encodeURIComponent(token)}`);
    },
    enabled: !!token,
  });

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(completeUserRegistrationSchema),
    defaultValues: {
      referralToken: token,
      packageAmount: "5000", // Default package
    },
  });

  // Registration mutation
  const submitRegistrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      return apiRequest('POST', '/api/referral/complete-registration', data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Registration Complete!",
        description: "Your account has been created. Check your email for login credentials.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to complete registration",
        variant: "destructive",
      });
    },
  });

  // Handle document upload
  const handleDocumentUpload = async (documentType: keyof typeof uploadedDocuments) => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      return { method: 'PUT', url: response.uploadURL };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const onDocumentComplete = (documentType: keyof typeof uploadedDocuments, result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType]: uploadURL
      }));
      
      // Update form with the uploaded document URL
      form.setValue(documentType, uploadURL);
      
      toast({
        title: "Document Uploaded",
        description: `${documentType.replace(/([A-Z])/g, ' $1').trim()} uploaded successfully`,
      });
    }
  };

  const onSubmit = (data: RegistrationFormData) => {
    // Check if all documents are uploaded
    if (!uploadedDocuments.panCardUrl || !uploadedDocuments.aadhaarCardUrl || 
        !uploadedDocuments.bankStatementUrl || !uploadedDocuments.photoUrl) {
      toast({
        title: "Documents Required",
        description: "Please upload all required documents before submitting",
        variant: "destructive",
      });
      return;
    }

    submitRegistrationMutation.mutate({
      ...data,
      ...uploadedDocuments,
      referralToken: token,
    });
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-4"></div>
            <p className="text-white/70">Validating referral link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenValidation && !tokenValidation.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Link</h2>
            <p className="text-white/70 mb-6">
              This referral link is invalid, expired, or has already been used.
            </p>
            <Button
              onClick={() => setLocation('/')}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Registration Complete!</h2>
            <p className="text-white/70 mb-6">
              Your account has been created successfully. You'll receive an email 
              with your login credentials shortly. You can now log in to your account.
            </p>
            <Button
              onClick={() => setLocation('/')}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <VoltverashopLogo className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Registration</h1>
          <Badge variant="secondary" className="bg-green-400/20 text-green-300 border-green-400/30">
            Referral Registration
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <UserPlus className="mr-2 h-5 w-5 text-green-400" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">First Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-firstName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-lastName"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Mobile Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="tel"
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Date of Birth</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-dateOfBirth"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password"
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <MapPin className="mr-2 h-5 w-5 text-green-400" />
                  Address Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Complete Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            className="bg-black/50 border-white/20 text-white"
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">City</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">State</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Pincode</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-pincode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* KYC Information */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-green-400" />
                  KYC Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">PAN Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          placeholder="ABCDE1234F"
                          data-testid="input-panNumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aadhaarNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          placeholder="1234 5678 9012"
                          data-testid="input-aadhaarNumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-green-400" />
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bankAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Account Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-bankAccountNumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankIFSC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">IFSC Code</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          placeholder="BANK0001234"
                          data-testid="input-bankIFSC"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Bank Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-black/50 border-white/20 text-white"
                            data-testid="input-bankName"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Package Selection */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Package Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="packageAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Select Package</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/50 border-white/20 text-white">
                            <SelectValue placeholder="Select package amount" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5000">₹5,000 - Basic Package</SelectItem>
                          <SelectItem value="10000">₹10,000 - Premium Package</SelectItem>
                          <SelectItem value="25000">₹25,000 - VIP Package</SelectItem>
                          <SelectItem value="50000">₹50,000 - Executive Package</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card className="bg-black/20 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Upload className="mr-2 h-5 w-5 text-green-400" />
                  Document Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">PAN Card</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={() => handleDocumentUpload('panCardUrl')}
                    onComplete={(result) => onDocumentComplete('panCardUrl', result)}
                    buttonClassName="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {uploadedDocuments.panCardUrl ? 'PAN Card Uploaded' : 'Upload PAN Card'}
                  </ObjectUploader>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Aadhaar Card</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={() => handleDocumentUpload('aadhaarCardUrl')}
                    onComplete={(result) => onDocumentComplete('aadhaarCardUrl', result)}
                    buttonClassName="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {uploadedDocuments.aadhaarCardUrl ? 'Aadhaar Card Uploaded' : 'Upload Aadhaar Card'}
                  </ObjectUploader>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Bank Statement</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880} // 5MB
                    onGetUploadParameters={() => handleDocumentUpload('bankStatementUrl')}
                    onComplete={(result) => onDocumentComplete('bankStatementUrl', result)}
                    buttonClassName="w-full"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {uploadedDocuments.bankStatementUrl ? 'Bank Statement Uploaded' : 'Upload Bank Statement'}
                  </ObjectUploader>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Profile Photo</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={2097152} // 2MB
                    onGetUploadParameters={() => handleDocumentUpload('photoUrl')}
                    onComplete={(result) => onDocumentComplete('photoUrl', result)}
                    buttonClassName="w-full"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploadedDocuments.photoUrl ? 'Photo Uploaded' : 'Upload Photo'}
                  </ObjectUploader>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                type="submit"
                disabled={submitRegistrationMutation.isPending}
                className="w-full max-w-md bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                data-testid="button-submit"
              >
                {submitRegistrationMutation.isPending ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}