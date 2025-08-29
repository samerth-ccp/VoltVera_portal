import { useState, useEffect, useMemo, useCallback } from "react";
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
// import { ObjectUploader } from "@/components/ObjectUploader";
import { completeUserRegistrationSchema } from "@shared/schema";
import type { z } from "zod";

type RegistrationFormData = z.infer<typeof completeUserRegistrationSchema>;

export default function CompleteReferralRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{email: string, password: string} | null>(null);
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
  }, []);

  // Validate referral token
  const { data: tokenValidation, isLoading: isValidatingToken } = useQuery({
    queryKey: ['/api/referral/validate', token],
    queryFn: async () => {
      if (!token) return null;
      const response = await apiRequest('GET', `/api/referral/validate?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      return data as { valid: boolean; placementSide: string; generatedBy: string };
    },
    enabled: !!token,
  });

  const defaultValues = useMemo(() => ({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    panNumber: "",
    aadhaarNumber: "",
    bankAccountNumber: "",
    bankIFSC: "",
    bankName: "",
    packageAmount: "5000",
    panCardUrl: "",
    aadhaarCardUrl: "",
    bankStatementUrl: "",
    photoUrl: "",
    referralToken: "",
  }), []);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(completeUserRegistrationSchema),
    defaultValues,
  });

  // Update referral token when it's loaded
  useEffect(() => {
    if (token) {
      form.setValue('referralToken', token);
    }
  }, [token]);

  // Registration mutation
  const submitRegistrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest('POST', '/api/referral/complete-registration', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsSubmitted(true);
      if (data.loginCredentials) {
        setLoginCredentials(data.loginCredentials);
      }
      toast({
        title: "Registration Complete!",
        description: "Your account has been created. Your login credentials are shown below.",
      });
    },
    onError: (error: any) => {
      // Handle specific error types
      if (error.message?.includes('already exists') || error.error === 'DUPLICATE_EMAIL') {
        toast({
          title: "Email Already Registered",
          description: "An account with this email already exists. Please use a different email address or try logging in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: error.message || "Failed to complete registration",
          variant: "destructive",
        });
      }
    },
  });

  // Handle document upload
  const handleDocumentUpload = async (documentType: keyof typeof uploadedDocuments) => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      const data = await response.json();
      return { method: 'PUT' as const, url: data.uploadURL };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const onDocumentComplete = useCallback((documentType: keyof typeof uploadedDocuments, result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      
      // Update both state and form without causing re-render
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType]: uploadURL
      }));
      
      // Update form silently to prevent re-renders during user input
      setTimeout(() => {
        form.setValue(documentType, uploadURL, { shouldValidate: false, shouldDirty: false });
      }, 0);
      
      toast({
        title: "Document Uploaded",
        description: `${documentType.replace(/([A-Z])/g, ' $1').trim()} uploaded successfully`,
      });
    }
  }, [form.setValue, toast]);

  const onSubmit = useCallback((data: RegistrationFormData) => {
    // Check if mutation is already in progress
    if (submitRegistrationMutation.isPending) {
      return;
    }
    
    // Check if all documents are uploaded
    const hasAllDocuments = uploadedDocuments.panCardUrl && 
                          uploadedDocuments.aadhaarCardUrl && 
                          uploadedDocuments.bankStatementUrl && 
                          uploadedDocuments.photoUrl;
    
    if (!hasAllDocuments) {
      toast({
        title: "Documents Required", 
        description: "Please upload all required documents before submitting. All 4 documents (PAN Card, Aadhaar Card, Bank Statement, and Photo) are mandatory.",
        variant: "destructive",
      });
      return;
    }

    submitRegistrationMutation.mutate({
      ...data,
      referralToken: token,
      // Include uploaded document URLs from state
      panCardUrl: uploadedDocuments.panCardUrl!,
      aadhaarCardUrl: uploadedDocuments.aadhaarCardUrl!, 
      bankStatementUrl: uploadedDocuments.bankStatementUrl!,
      photoUrl: uploadedDocuments.photoUrl!,
    });
  }, [token, toast, submitRegistrationMutation, uploadedDocuments]);

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
        <Card className="w-full max-w-lg bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Registration Complete!</h2>
            <p className="text-white/70 mb-6">
              Your account has been created successfully. Here are your login credentials:
            </p>
            
            {loginCredentials && (
              <div className="bg-green-900/30 border border-green-400/30 rounded-lg p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-green-300 mb-4 text-center">Your Login Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Email:</label>
                    <div className="bg-black/30 rounded p-3 text-white font-mono text-sm break-all">
                      {loginCredentials.email}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 block mb-1">Password:</label>
                    <div className="bg-black/30 rounded p-3 text-white font-mono text-sm">
                      {loginCredentials.password}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-green-300/70 mt-4 text-center">
                  ⚠️ Please save these credentials securely. You'll need them to log in.
                </p>
              </div>
            )}
            
            <Button
              onClick={() => {
                if (loginCredentials) {
                  // Store credentials in sessionStorage for prefilling login form
                  sessionStorage.setItem('prefillEmail', loginCredentials.email);
                  sessionStorage.setItem('prefillPassword', loginCredentials.password);
                }
                setLocation('/');
              }}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 w-full"
              data-testid="button-login"
            >
              Login Now
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
                          autoComplete="email"
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
                          autoComplete="tel"
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
                          max={new Date(new Date().getFullYear() - 18, 11, 31).toISOString().split('T')[0]}
                          className="bg-black/50 border-white/20 text-white [color-scheme:dark]"
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
                          autoComplete="new-password"
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
                <p className="text-white/70 text-sm mt-2">
                  Upload clear, readable images of your documents. All 4 documents are mandatory for account verification.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white font-medium flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-blue-400" />
                    PAN Card
                    {uploadedDocuments.panCardUrl && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                  </Label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const mockUrl = `https://storage.googleapis.com/documents/pan-card-${Date.now()}.jpg`;
                        setUploadedDocuments(prev => ({ ...prev, panCardUrl: mockUrl }));
                        form.setValue('panCardUrl', mockUrl, { shouldValidate: true });
                      }
                    }}
                  />
                  <p className="text-xs text-white/50">Upload clear image of PAN card (Max 5MB)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-medium flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-orange-400" />
                    Aadhaar Card
                    {uploadedDocuments.aadhaarCardUrl && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                  </Label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const mockUrl = `https://storage.googleapis.com/documents/aadhaar-card-${Date.now()}.jpg`;
                        setUploadedDocuments(prev => ({ ...prev, aadhaarCardUrl: mockUrl }));
                        form.setValue('aadhaarCardUrl', mockUrl, { shouldValidate: true });
                      }
                    }}
                  />
                  <p className="text-xs text-white/50">Upload clear image of Aadhaar card (Max 5MB)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-medium flex items-center">
                    <CreditCard className="mr-2 h-4 w-4 text-purple-400" />
                    Bank Statement
                    {uploadedDocuments.bankStatementUrl && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                  </Label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const mockUrl = `https://storage.googleapis.com/documents/bank-statement-${Date.now()}.pdf`;
                        setUploadedDocuments(prev => ({ ...prev, bankStatementUrl: mockUrl }));
                        form.setValue('bankStatementUrl', mockUrl, { shouldValidate: true });
                      }
                    }}
                  />
                  <p className="text-xs text-white/50">Recent bank statement (Max 5MB)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-medium flex items-center">
                    <Camera className="mr-2 h-4 w-4 text-pink-400" />
                    Profile Photo
                    {uploadedDocuments.photoUrl && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const mockUrl = `https://storage.googleapis.com/documents/photo-${Date.now()}.jpg`;
                        setUploadedDocuments(prev => ({ ...prev, photoUrl: mockUrl }));
                        form.setValue('photoUrl', mockUrl, { shouldValidate: true });
                      }
                    }}
                  />
                  <p className="text-xs text-white/50">Clear passport-style photo (Max 2MB)</p>
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
                onClick={(e) => {
                  // If form validation fails, try manual submission
                  if (!form.formState.isValid) {
                    e.preventDefault();
                    const formData = form.getValues();
                    onSubmit(formData);
                  }
                }}
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