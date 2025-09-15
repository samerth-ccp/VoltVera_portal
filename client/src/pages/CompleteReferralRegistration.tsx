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
  isCompressing?: boolean;
}

export default function CompleteReferralRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [uploadedDocuments, setUploadedDocuments] = useState<{
    panCard?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    bankCancelledCheque?: string;
    photo?: string;
  }>({});

  const [documentFiles, setDocumentFiles] = useState<{
    panCard?: UploadedDocument;
    aadhaarFront?: UploadedDocument;
    aadhaarBack?: UploadedDocument;
    bankCancelledCheque?: UploadedDocument;
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
    nominee: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    panNumber: "",
    aadhaarNumber: "",
    bankAccountNumber: "",
    bankIFSC: "",
    bankName: "",
    bankAccountHolderName: "",
    packageAmount: "5000",
    // Document fields are optional - default to empty strings
    panCardUrl: "",
    aadhaarFrontUrl: "",
    aadhaarBackUrl: "",
    bankCancelledChequeUrl: "",
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

  // Image compression function
  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Only compress image files
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Enhanced file validation
  const validateFile = (documentType: keyof typeof documentFiles, file: File) => {
    // File size validation
    const maxSize = 10 * 1024 * 1024; // 10MB for all documents (will be compressed)
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
  const handleFileChange = async (documentType: keyof typeof documentFiles, file: File | null) => {
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

    try {
      // Compress image files before validation
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        console.log('Compressing image:', file.name, 'Original size:', file.size);
        
        // Show compression status
        setDocumentFiles(prev => ({
          ...prev,
          [documentType]: {
            file,
            preview: URL.createObjectURL(file),
            uploadProgress: 0,
            isUploading: true,
            error: undefined,
            retryCount: 0,
            isCompressing: true,
          }
        }));

        processedFile = await compressImage(file);
        console.log('Compressed size:', processedFile.size, 'Reduction:', ((file.size - processedFile.size) / file.size * 100).toFixed(1) + '%');
      }

      // Enhanced file validation
      const validationResult = validateFile(documentType, processedFile);
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
        doc && doc.file.name === processedFile.name && doc !== documentFiles[documentType]
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
      const preview = URL.createObjectURL(processedFile);
      
      console.log('Adding file to documentFiles:', { documentType, file: processedFile.name });
      
      // Add file to state
      setDocumentFiles(prev => ({
        ...prev,
        [documentType]: {
          file: processedFile,
          preview,
          uploadProgress: 0,
          isUploading: false,
          error: undefined,
          retryCount: 0,
        }
      }));

      // Auto-upload the file
      console.log('Calling handleFileUpload for:', documentType);
      handleFileUpload(documentType, processedFile);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "File Processing Error",
        description: "Failed to process the selected file. Please try again.",
        variant: "destructive",
      });
    }
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
      aadhaarFrontUrl: uploadedDocuments.aadhaarFront || '',
      aadhaarBackUrl: uploadedDocuments.aadhaarBack || '',
      bankCancelledChequeUrl: uploadedDocuments.bankCancelledCheque || '',
      photoUrl: uploadedDocuments.photo || '',
    };

    // Validate that documents are properly processed
    const documentFields = ['panCardUrl', 'aadhaarFrontUrl', 'aadhaarBackUrl', 'bankCancelledChequeUrl', 'photoUrl'];
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
            {/* Mandatory Fields Notice */}
            <div className="bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <p className="text-yellow-300 text-sm">
                  Fields marked with <span className="text-red-400 font-bold">*</span> are mandatory and must be filled out to complete registration.
                </p>
              </div>
            </div>
            {/* Sponsor Information */}
            {tokenValidation && (
              <Card className="bg-blue-900/20 backdrop-blur-sm border-blue-400/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserPlus className="mr-2 h-5 w-5 text-blue-400" />
                    Sponsor Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white font-medium">Sponsor UserID</Label>
                      <div className="bg-black/50 border border-white/20 rounded-md p-3 text-white">
                        {tokenValidation.generatedBy || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-white font-medium">Placement Side</Label>
                      <div className="bg-black/50 border border-white/20 rounded-md p-3 text-white">
                        {tokenValidation.placementSide || 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <FormLabel className="text-white">First Name <span className="text-red-400">*</span></FormLabel>
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
                      <FormLabel className="text-white">Last Name <span className="text-red-400">*</span></FormLabel>
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
                      <FormLabel className="text-white">Email Address <span className="text-red-400">*</span></FormLabel>
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
                      <FormLabel className="text-white">Mobile Number <span className="text-red-400">*</span></FormLabel>
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
                  name="nominee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Nominee <span className="text-red-400">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-black/50 border-white/20 text-white"
                          data-testid="input-nominee"
                          placeholder="Enter nominee name"
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
                      <FormLabel className="text-white">Password <span className="text-red-400">*</span></FormLabel>
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
                        <FormLabel className="text-white">Complete Address <span className="text-red-400">*</span></FormLabel>
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
                      <FormLabel className="text-white">City <span className="text-red-400">*</span></FormLabel>
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
                      <FormLabel className="text-white">State <span className="text-red-400">*</span></FormLabel>
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
                      <FormLabel className="text-white">Pincode <span className="text-red-400">*</span></FormLabel>
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
                  <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-300 border-blue-400/30">
                    Optional
                  </Badge>
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
                          onChange={(e) => {
                            // Convert to uppercase as user types
                            field.onChange(e.target.value.toUpperCase());
                          }}
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
                  <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-300 border-blue-400/30">
                    Optional
                  </Badge>
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
                          onChange={(e) => {
                            // Convert to uppercase as user types
                            field.onChange(e.target.value.toUpperCase());
                          }}
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
                          onChange={(e) => {
                            // Convert to uppercase as user types
                            field.onChange(e.target.value.toUpperCase());
                          }}
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
                            onChange={(e) => {
                              // Convert to uppercase as user types
                              field.onChange(e.target.value.toUpperCase());
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="bankAccountHolderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Account Holder Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            className="bg-black/50 border-white/20 text-white"
                            data-testid="input-bankAccountHolderName"
                            placeholder="Enter account holder name"
                            onChange={(e) => {
                              // Convert to uppercase as user types
                              field.onChange(e.target.value.toUpperCase());
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Package Selection - Hidden but still functional */}
            {/* The packageAmount field is hidden from UI but still maintains default value of "5000" */}
            {/* This ensures form submission works without user interaction */}
            <FormField
              control={form.control}
              name="packageAmount"
              render={({ field }) => (
                <FormItem style={{ display: 'none' }}>
                  <FormControl>
                    <Input {...field} value="5000" />
                  </FormControl>
                </FormItem>
              )}
            />

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
                                     <p className="text-xs text-white/50">Upload clear image of PAN card (Max 10MB, auto-compressed) - Optional</p>
                  {documentFiles.panCard && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.panCard.isCompressing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-400" />
                      ) : documentFiles.panCard.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.panCard.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.panCard.file.name}
                      {documentFiles.panCard.isCompressing && (
                        <span className="ml-2 text-blue-400"> (Compressing...)</span>
                      )}
                      {documentFiles.panCard.isUploading && !documentFiles.panCard.isCompressing && (
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
                       Aadhaar Front
                       {uploadedDocuments.aadhaarFront && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*,.pdf"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('Aadhaar Front file input change:', e.target.files);
                       handleFileChange('aadhaarFront', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Upload clear image of Aadhaar front (Max 10MB, auto-compressed) - Optional</p>
                  {documentFiles.aadhaarFront && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.aadhaarFront.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.aadhaarFront.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.aadhaarFront.file.name}
                      {documentFiles.aadhaarFront.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.aadhaarFront.uploadProgress}%)</span>
                      )}
                      {documentFiles.aadhaarFront.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.aadhaarFront.error})</span>
                      )}
                      {!documentFiles.aadhaarFront.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('aadhaarFront')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('aadhaarFront')}
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
                       Aadhaar Back
                       {uploadedDocuments.aadhaarBack && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*,.pdf"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('Aadhaar Back file input change:', e.target.files);
                       handleFileChange('aadhaarBack', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Upload clear image of Aadhaar back (Max 10MB, auto-compressed) - Optional</p>
                  {documentFiles.aadhaarBack && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.aadhaarBack.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.aadhaarBack.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.aadhaarBack.file.name}
                      {documentFiles.aadhaarBack.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.aadhaarBack.uploadProgress}%)</span>
                      )}
                      {documentFiles.aadhaarBack.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.aadhaarBack.error})</span>
                      )}
                      {!documentFiles.aadhaarBack.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('aadhaarBack')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('aadhaarBack')}
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
                       Bank/Cancelled Cheque
                       {uploadedDocuments.bankCancelledCheque && <CheckCircle className="ml-2 h-4 w-4 text-green-400" />}
                     </Label>
                                     <input
                     type="file"
                     accept="image/*,.pdf"
                     className="w-full bg-black/50 border border-white/20 rounded-md p-2 text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                     onChange={(e) => {
                       console.log('Bank/Cancelled Cheque file input change:', e.target.files);
                       handleFileChange('bankCancelledCheque', e.target.files?.[0] || null);
                     }}
                   />
                                     <p className="text-xs text-white/50">Bank details or cancelled cheque (Max 10MB, auto-compressed) - Optional</p>
                  {documentFiles.bankCancelledCheque && (
                    <div className="flex items-center text-sm text-white/70 mt-2">
                      {documentFiles.bankCancelledCheque.isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : documentFiles.bankCancelledCheque.error ? (
                        <X className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      {documentFiles.bankCancelledCheque.file.name}
                      {documentFiles.bankCancelledCheque.isUploading && (
                        <span className="ml-2 text-green-400"> ({documentFiles.bankCancelledCheque.uploadProgress}%)</span>
                      )}
                      {documentFiles.bankCancelledCheque.error && (
                        <span className="ml-2 text-red-400"> ({documentFiles.bankCancelledCheque.error})</span>
                      )}
                      {!documentFiles.bankCancelledCheque.isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryUpload('bankCancelledCheque')}
                          className="ml-2 text-green-400 hover:text-green-300"
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile('bankCancelledCheque')}
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
                                     <p className="text-xs text-white/50">Clear passport-style photo (Max 10MB, auto-compressed) - Optional</p>
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