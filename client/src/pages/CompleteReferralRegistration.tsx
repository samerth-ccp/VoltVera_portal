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
import { UserPlus, CheckCircle, AlertCircle, Upload, FileText, Camera, CreditCard, MapPin, X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import { completeUserRegistrationSchema } from "@shared/schema";
import type { z } from "zod";

type RegistrationFormData = z.infer<typeof completeUserRegistrationSchema>;

interface UploadedDocument {
  file: File;
  preview: string;
  uploadProgress: number;
  isUploading: boolean;
  error?: string;
  retryCount: number;
}

export default function CompleteReferralRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [uploadedDocuments, setUploadedDocuments] = useState<{
    panCard?: string;
    aadhaarCard?: string;
    bankStatement?: string;
    photo?: string;
  }>({});

  const [documentFiles, setDocumentFiles] = useState<{
    panCard?: UploadedDocument;
    aadhaarCard?: UploadedDocument;
    bankStatement?: UploadedDocument;
    photo?: UploadedDocument;
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
    // Document fields are optional - default to empty strings
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

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(documentFiles).forEach(doc => {
        if (doc?.preview) {
          URL.revokeObjectURL(doc.preview);
        }
      });
    };
  }, [documentFiles]);



  // Convert file to data URL for direct submission
  const convertFileToDataURL = (file: File): Promise<string> => {
    console.log('Converting file to data URL:', { name: file.name, size: file.size, type: file.type });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataURL = reader.result as string;
        console.log('FileReader result:', dataURL.substring(0, 100) + '...');
        resolve(dataURL);
      };
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  // Enhanced file validation
  const validateFile = (documentType: keyof typeof documentFiles, file: File) => {
    // File size validation
    const maxSize = documentType === 'photo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `${documentType.replace(/([A-Z])/g, ' $1').trim()} file size must be less than ${maxSize / (1024 * 1024)}MB`
      };
    }

    // File type validation with strict checking
    const allowedTypes = documentType === 'photo' 
      ? ['image/jpeg', 'image/png', 'image/jpg']
      : ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `${documentType.replace(/([A-Z])/g, ' $1').trim()} must be ${documentType === 'photo' ? 'an image (JPG, PNG)' : 'an image (JPG, PNG) or PDF'}`
      };
    }

    // Additional validation for specific document types
    if (documentType === 'photo' && file.type === 'application/pdf') {
      return {
        isValid: false,
        error: 'Profile photo must be an image file, not PDF'
      };
    }

    return { isValid: true, error: '' };
  };

  // Handle file selection
  const handleFileChange = (documentType: keyof typeof documentFiles, file: File | null) => {
    console.log('handleFileChange called:', { documentType, file: file ? { name: file.name, size: file.size, type: file.type } : null });
    
    if (!file) {
      // Remove file
      setDocumentFiles(prev => ({
        ...prev,
        [documentType]: undefined
      }));
      setUploadedDocuments(prev => ({
        ...prev,
        [documentType.replace('Url', '') as keyof typeof uploadedDocuments]: undefined
      }));
      return;
    }

    // Enhanced file validation
    const validationResult = validateFile(documentType, file);
    if (!validationResult.isValid) {
      toast({
        title: "Invalid File",
        description: validationResult.error,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate files across different document types
    const isDuplicate = Object.values(documentFiles).some(doc => 
      doc && doc.file.name === file.name && doc !== documentFiles[documentType]
    );
    
    if (isDuplicate) {
      toast({
        title: "Duplicate File",
        description: "This file is already selected for another document type. Please use a different file.",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    
    console.log('Adding file to documentFiles:', { documentType, file: file.name });
    
    // Add file to state
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: {
        file,
        preview,
        uploadProgress: 0,
        isUploading: false,
        error: undefined,
        retryCount: 0,
      }
    }));

    // Auto-upload the file
    console.log('Calling handleFileUpload for:', documentType);
    handleFileUpload(documentType, file);
  };

  // Enhanced file processing with progress simulation
  const handleFileUpload = async (documentType: keyof typeof documentFiles, file: File, isRetry = false) => {
    const docType = documentType.replace('Url', '') as keyof typeof uploadedDocuments;
    
    // Update state to show processing
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType]!,
        isUploading: true,
        uploadProgress: isRetry ? 0 : 25,
        error: undefined,
        retryCount: isRetry ? (prev[documentType]?.retryCount || 0) + 1 : 0,
      }
    }));

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      // Simulate progress for better UX
      progressInterval = setInterval(() => {
        setDocumentFiles(prev => {
          const current = prev[documentType];
          if (current && current.isUploading && current.uploadProgress < 90) {
            return {
              ...prev,
              [documentType]: {
                ...current,
                uploadProgress: Math.min(current.uploadProgress + 10, 90)
              }
            };
          }
          return prev;
        });
      }, 200);

      // Convert file to data URL for direct submission
      const dataURL = await convertFileToDataURL(file);
      
      console.log(`Processing ${documentType}:`, { file: file.name, size: file.size, type: file.type });
      console.log(`Data URL generated:`, dataURL.substring(0, 100) + '...');
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Update progress to 100%
      setDocumentFiles(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType]!,
          uploadProgress: 100,
          isUploading: false,
          error: undefined,
        }
      }));

      // Update uploaded documents with data URL
      setUploadedDocuments(prev => {
        console.log(`Updating uploadedDocuments for ${docType}:`, dataURL.substring(0, 100) + '...');
        return {
          ...prev,
          [docType]: dataURL
        };
      });

      // Update form with data URL - need to append 'Url' to match form field names
      const formFieldName = `${docType}Url` as keyof RegistrationFormData;
      form.setValue(formFieldName, dataURL, { shouldValidate: true });
      
      console.log(`Updated form field ${formFieldName} with data URL`);
      
      // Verify form value was set correctly
      const currentFormValue = form.getValues(formFieldName);
      console.log(`Form field ${formFieldName} now contains:`, currentFormValue ? currentFormValue.substring(0, 100) + '...' : 'empty');

      toast({
        title: "Document Ready",
        description: `${documentType.replace(/([A-Z])/g, ' $1').trim()} processed successfully and ready for submission`,
      });

    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      const retryCount = documentFiles[documentType]?.retryCount || 0;
      
      // Handle error with retry logic
      if (retryCount < 3 && !isRetry) {
        // Auto-retry for processing errors
        toast({
          title: "Processing Failed",
          description: `Retrying processing automatically... (${retryCount + 1}/3)`,
          variant: "destructive",
        });
        
        setTimeout(() => {
          handleFileUpload(documentType, file, true);
        }, 2000);
        return;
      }

      // Final error state
      setDocumentFiles(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType]!,
          isUploading: false,
          error: errorMessage,
          uploadProgress: 0,
        }
      }));

      toast({
        title: "Processing Failed",
        description: `Failed to process ${documentType.replace(/([A-Z])/g, ' $1').trim()}. ${retryCount >= 3 ? 'Max retries reached. Please try again.' : errorMessage}`,
        variant: "destructive",
      });
    }
  };

  // Enhanced retry function
  const retryUpload = (documentType: keyof typeof documentFiles) => {
    const doc = documentFiles[documentType];
    if (!doc) return;

    // Reset error state and retry
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType]!,
        error: undefined,
        uploadProgress: 0,
        retryCount: 0,
      }
    }));

    handleFileUpload(documentType, doc.file, true);
  };

  // Enhanced remove file function
  const removeFile = (documentType: keyof typeof documentFiles) => {
    const doc = documentFiles[documentType];
    if (doc?.preview) {
      URL.revokeObjectURL(doc.preview);
    }
    
    setDocumentFiles(prev => ({
      ...prev,
      [documentType]: undefined
    }));
    
    // Clear uploaded documents state
    setUploadedDocuments(prev => ({
      ...prev,
      [documentType]: undefined
    }));
    
    // Clear form field - need to append 'Url' to match form field names
    const formFieldName = `${documentType}Url` as keyof RegistrationFormData;
    form.setValue(formFieldName, '', { shouldValidate: true });
    
    console.log(`Cleared form field ${formFieldName}`);
  };

  // Check if form can be submitted
  const canSubmitForm = useMemo(() => {
    // Documents are now optional - form can be submitted without them
    const hasUploadErrors = Object.values(documentFiles).some(doc => doc?.error);
    const hasUploadingFiles = Object.values(documentFiles).some(doc => doc?.isUploading);
    
    // Only block submission if there are upload errors or files are still uploading
    const canSubmit = !hasUploadErrors && !hasUploadingFiles;
    
    console.log('canSubmitForm check:', {
      hasUploadErrors,
      hasUploadingFiles,
      canSubmit,
      documentFiles: Object.keys(documentFiles).filter(key => documentFiles[key as keyof typeof documentFiles]),
      uploadedDocuments: Object.keys(uploadedDocuments).filter(key => uploadedDocuments[key as keyof typeof uploadedDocuments])
    });
    
    return canSubmit;
  }, [documentFiles, uploadedDocuments]);

  // Registration mutation
  const submitRegistrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest('POST', '/api/referral/complete-registration', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsSubmitted(true);
      // Note: No login credentials provided immediately - admin approval required
      toast({
        title: "Registration Submitted!",
        description: data.message || "Your registration has been submitted for admin approval. You will receive login credentials via email once approved.",
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

  // Enhanced form submission
  const onSubmit = useCallback((data: RegistrationFormData) => {
    // Check if mutation is already in progress
    if (submitRegistrationMutation.isPending) {
      return;
    }
    
    // Check if there are any upload errors or files still uploading
    if (!canSubmitForm) {
      const errorDocs = Object.entries(documentFiles)
        .filter(([_, doc]) => doc?.error)
        .map(([type, _]) => type.replace(/([A-Z])/g, ' $1').trim());

      const uploadingDocs = Object.entries(documentFiles)
        .filter(([_, doc]) => doc?.isUploading)
        .map(([type, _]) => type.replace(/([A-Z])/g, ' $1').trim());

      let message = '';
      if (errorDocs.length > 0) {
        message += `Please fix upload errors for: ${errorDocs.join(', ')}. `;
      }
      if (uploadingDocs.length > 0) {
        message += `Please wait for uploads to complete: ${uploadingDocs.join(', ')}. `;
      }
      message += 'You can remove failed uploads and proceed, or wait for uploads to complete.';

      toast({
        title: "Upload Issues", 
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Prepare submission data with available document URLs
    const submissionData = {
      ...data,
      referralToken: token,
      // Include uploaded document data URLs if they exist, otherwise send empty strings
      // Note: uploadedDocuments keys are without 'Url' suffix, form fields have 'Url' suffix
      panCardUrl: uploadedDocuments.panCard || '',
      aadhaarCardUrl: uploadedDocuments.aadhaarCard || '',
      bankStatementUrl: uploadedDocuments.bankStatement || '',
      photoUrl: uploadedDocuments.photo || '',
    };

    // Validate that documents are properly processed
    const documentFields = ['panCardUrl', 'aadhaarCardUrl', 'bankStatementUrl', 'photoUrl'];
    const emptyDocuments = documentFields.filter(field => {
      const value = submissionData[field as keyof typeof submissionData];
      return !value || value === '';
    });
    
    if (emptyDocuments.length === documentFields.length) {
      console.warn('All document fields are empty - this might indicate a processing issue');
    } else {
      console.log('Document fields status:', documentFields.map(field => ({
        field,
        hasValue: !!submissionData[field as keyof typeof submissionData],
        valueLength: submissionData[field as keyof typeof submissionData]?.length || 0
      })));
    }

    // Debug: Log what's being sent
    console.log('Submitting data:', submissionData);
    console.log('Document state:', uploadedDocuments);
    console.log('Document files state:', documentFiles);
    console.log('Form values:', form.getValues());

    submitRegistrationMutation.mutate(submissionData);
  }, [token, toast, submitRegistrationMutation, uploadedDocuments, documentFiles, canSubmitForm]);

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
            <h2 className="text-2xl font-bold text-white mb-4">Registration Submitted!</h2>
            <p className="text-white/70 mb-6">
              Your profile has been submitted successfully and is now pending admin approval. 
              You will receive an email with your login credentials once approved by an administrator.
            </p>
            
            <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-blue-300 mb-4 text-center">What Happens Next?</h3>
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Admin will review your registration and documents</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>You'll receive an approval email with login credentials</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Complete KYC verification within 7 days of approval</p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => setLocation('/')}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 w-full"
              data-testid="button-return-home"
            >
              Return to Homepage
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
                    Upload clear, readable images of your documents. Documents are optional but recommended for faster verification. Documents will be processed and submitted with your registration.
                  </p>
                 
                                   {/* Document Processing Summary */}
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-400/30 rounded-lg">
                    <div className="flex items-center justify-between text-sm text-white/80 mb-2">
                      <span>Document Status</span>
                      <span className="text-blue-300">
                        {Object.values(uploadedDocuments).filter(Boolean).length} Document(s) Ready
                      </span>
                    </div>
                   <div className="w-full bg-blue-900/50 rounded-full h-2">
                     <div 
                       className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                       style={{ 
                         width: `${Math.min((Object.values(uploadedDocuments).filter(Boolean).length / 4) * 100, 100)}%` 
                       }}
                     ></div>
                   </div>
                   <div className="flex flex-wrap gap-2 mt-2">
                     {Object.entries(uploadedDocuments).map(([key, url]) => (
                       <Badge 
                         key={key}
                         variant={url ? "default" : "secondary"}
                         className={url ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"}
                       >
                         {key.replace(/([A-Z])/g, ' $1').trim()}: {url ? '✓' : 'Optional'}
                       </Badge>
                     ))}
                   </div>
                   
                   {/* Skip Documents Option */}
                   <div className="mt-3 pt-3 border-t border-blue-400/30">
                                           <p className="text-xs text-white/60 mb-2">
                        Don't have documents ready? You can skip and upload them later through your profile.
                      </p>
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                                                                       onClick={() => {
                           // Clear all document states to allow form submission
                           setDocumentFiles({});
                           setUploadedDocuments({});
                           // Clear form document fields - set to empty strings
                           form.setValue('panCardUrl', '');
                           form.setValue('aadhaarCardUrl', '');
                           form.setValue('bankStatementUrl', '');
                           form.setValue('photoUrl', '');
                           
                           console.log('Cleared all document form fields');
                         }}
                       className="w-full bg-transparent border-blue-400/50 text-blue-300 hover:bg-blue-400/10 hover:text-blue-200"
                     >
                       Skip Documents & Proceed
                     </Button>
                   </div>
                 </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                                       <Label className="text-white font-medium flex items-center">
                       <FileText className="mr-2 h-4 w-4 text-blue-400" />
                       PAN Card
                       {uploadedDocuments.panCard && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*,.pdf"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('PAN Card file input change:', e.target.files);
                       handleFileChange('panCard', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Upload clear image of PAN card (Max 5MB) - Optional</p>
                  {documentFiles.panCard && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.panCard.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.panCard.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.panCard.file.name}
                      {documentFiles.panCard.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.panCard.uploadProgress}%)</span>
                      )}
                      {documentFiles.panCard.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.panCard.error})</span>
                      )}
                      {!documentFiles.panCard.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('panCard')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('panCard')}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                                       <Label className="text-white font-medium flex items-center">
                       <FileText className="mr-2 h-4 w-4 text-orange-400" />
                       Aadhaar Card
                       {uploadedDocuments.aadhaarCard && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*,.pdf"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('Aadhaar Card file input change:', e.target.files);
                       handleFileChange('aadhaarCard', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Upload clear image of Aadhaar card (Max 5MB) - Optional</p>
                  {documentFiles.aadhaarCard && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.aadhaarCard.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.aadhaarCard.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.aadhaarCard.file.name}
                      {documentFiles.aadhaarCard.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.aadhaarCard.uploadProgress}%)</span>
                      )}
                      {documentFiles.aadhaarCard.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.aadhaarCard.error})</span>
                      )}
                      {!documentFiles.aadhaarCard.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('aadhaarCard')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('aadhaarCard')}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                                       <Label className="text-white font-medium flex items-center">
                       <CreditCard className="mr-2 h-4 w-4 text-purple-400" />
                       Bank Statement
                       {uploadedDocuments.bankStatement && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*,.pdf"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('Bank Statement file input change:', e.target.files);
                       handleFileChange('bankStatement', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Recent bank statement (Max 5MB) - Optional</p>
                  {documentFiles.bankStatement && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.bankStatement.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.bankStatement.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.bankStatement.file.name}
                      {documentFiles.bankStatement.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.bankStatement.uploadProgress}%)</span>
                      )}
                      {documentFiles.bankStatement.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.bankStatement.error})</span>
                      )}
                      {!documentFiles.bankStatement.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('bankStatement')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('bankStatement')}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                                       <Label className="text-white font-medium flex items-center">
                       <Camera className="mr-2 h-4 w-4 text-pink-400" />
                       Profile Photo
                       {uploadedDocuments.photo && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('Photo file input change:', e.target.files);
                       handleFileChange('photo', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Clear passport-style photo (Max 2MB) - Optional</p>
                  {documentFiles.photo && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.photo.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.photo.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.photo.file.name}
                      {documentFiles.photo.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.photo.uploadProgress}%)</span>
                      )}
                      {documentFiles.photo.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.photo.error})</span>
                      )}
                      {!documentFiles.photo.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('photo')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('photo')}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                type="submit"
                disabled={submitRegistrationMutation.isPending || !canSubmitForm}
                className={`w-full max-w-md ${
                  canSubmitForm 
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600' 
                    : 'bg-gray-500 cursor-not-allowed'
                }`}
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
                                 {submitRegistrationMutation.isPending 
                   ? 'Creating Account...' 
                   : !canSubmitForm 
                     ? 'Complete Registration (Resolving Upload Issues...)'
                     : 'Complete Registration'
                 }
              </Button>
              
                             {!canSubmitForm && (
                 <div className="mt-3 text-sm text-white/60">
                   {Object.values(documentFiles).some(doc => doc?.error) && (
                     <p className="text-red-400 mb-2">⚠️ Some documents failed to upload. You can retry, remove them, or proceed without them.</p>
                   )}
                   {Object.values(documentFiles).some(doc => doc?.isUploading) && (
                     <p className="text-blue-400 mb-2">⏳ Please wait for uploads to complete, or remove them to proceed immediately.</p>
                   )}
                 </div>
               )}
               
               {canSubmitForm && (
                 <div className="mt-3 text-sm text-white/60">
                   <p className="text-green-400">✅ Ready to submit! Documents are optional but help with faster verification.</p>
                   {Object.values(uploadedDocuments).filter(Boolean).length > 0 && (
                     <p className="text-blue-400">📎 {Object.values(uploadedDocuments).filter(Boolean).length} document(s) will be included in your registration.</p>
                   )}
                 </div>
               )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}