import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, CheckCircle, Clock, XCircle, FileText, Camera, CreditCard, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const kycSchema = z.object({
  documentType: z.enum(['pan', 'aadhaar_front', 'aadhaar_back', 'bank_cancelled_cheque', 'photo'], {
    required_error: "Please select a document type"
  }),
  documentNumber: z.string().optional(),
  documentFile: z.instanceof(File).optional(),
});

type KYCForm = z.infer<typeof kycSchema>;

interface KYCDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  documentNumber?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

const documentTypes = [
  { value: 'pan', label: 'PAN Card', icon: CreditCard, description: 'Permanent Account Number Card' },
  { value: 'aadhaar', label: 'Aadhaar Card', icon: FileText, description: 'Aadhaar Card (Front & Back)' },
  { value: 'bank_statement', label: 'Bank Statement', icon: Building, description: 'Bank Statement or Cancelled Cheque' },
  { value: 'photo', label: 'Photo ID', icon: Camera, description: 'Passport Photo or ID Photo' },
];

export default function KYCUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<KYCForm>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      documentType: 'pan',
      documentNumber: "",
    },
  });

  // Fetch existing KYC documents
  const { data: kycDocuments = [], isLoading } = useQuery<KYCDocument[]>({
    queryKey: ['/api/kyc'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/kyc');
      return await response.json();
    },
  });

  // Convert file to Base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix to get pure base64
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Submit KYC document with binary data
  const submitKycMutation = useMutation({
    mutationFn: async (data: { 
      documentType: string; 
      documentData: string; 
      documentContentType: string;
      documentFilename: string;
      documentNumber?: string;
    }) => {
      return apiRequest('POST', '/api/kyc/upload', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc'] });
      form.reset();
      setSelectedFile(null);
      toast({
        title: "Document Uploaded",
        description: "Your KYC document has been uploaded successfully and is under review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update existing KYC document
  const updateKycMutation = useMutation({
    mutationFn: async (data: { 
      documentId: string;
      documentType: string; 
      documentData: string; 
      documentContentType: string;
      documentFilename: string;
      documentNumber?: string;
    }) => {
      return apiRequest('PUT', `/api/kyc/${data.documentId}`, {
        documentType: data.documentType,
        documentData: data.documentData,
        documentContentType: data.documentContentType,
        documentFilename: data.documentFilename,
        documentNumber: data.documentNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc'] });
      form.reset();
      setSelectedFile(null);
      toast({
        title: "Document Updated",
        description: "Your KYC document has been updated successfully and is under review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: KYCForm) => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a document to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert file to Base64
      const documentData = await convertFileToBase64(selectedFile);
      
      // Check if there's an existing document of the same type
      // Find the most recent document of this type (regardless of status)
      const existingDocs = kycDocuments.filter(doc => doc.documentType === data.documentType);
      const existingDoc = existingDocs.length > 0 
        ? existingDocs.reduce((latest, current) => 
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          )
        : null;
      
      if (existingDoc) {
        // Update existing document
        console.log('🔄 Updating existing document:', existingDoc.id, 'Status:', existingDoc.status);
        await updateKycMutation.mutateAsync({
          documentId: existingDoc.id,
          documentType: data.documentType,
          documentData,
          documentContentType: selectedFile.type,
          documentFilename: selectedFile.name,
          documentNumber: data.documentNumber,
        });
      } else {
        // Create new document
        console.log('📄 Creating new document');
        await submitKycMutation.mutateAsync({
          documentType: data.documentType,
          documentData,
          documentContentType: selectedFile.type,
          documentFilename: selectedFile.name,
          documentNumber: data.documentNumber,
        });
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a JPEG, PNG, or PDF file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'success',
      rejected: 'destructive',
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };


  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold text-gray-900">
            <FileText className="mr-3 h-8 w-8 text-volt-light" />
            KYC Verification
          </CardTitle>
          <CardDescription>
            Complete your identity verification by uploading the required documents. This helps us ensure the security of your account.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Existing Documents Status */}
      {kycDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Document Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {kycDocuments.map((doc) => {
                const docType = documentTypes.find(type => type.value === doc.documentType);
                const Icon = docType?.icon || FileText;
                
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6 text-gray-500" />
                      <div>
                        <p className="font-medium">{docType?.label || doc.documentType}</p>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        {doc.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">{doc.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(doc.status)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload New Document */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Upload New Document</CardTitle>
          <CardDescription>
            Upload your identity documents for verification. Accepted formats: JPEG, PNG, PDF (Max 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentTypes.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center space-x-2">
                                <Icon className="h-4 w-4" />
                                <div>
                                  <span>{type.label}</span>
                                  <p className="text-xs text-gray-500">{type.description}</p>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter document number if applicable" 
                        {...field}
                        onChange={(e) => {
                          // Convert to uppercase if document type is PAN
                          const value = form.getValues('documentType') === 'pan' 
                            ? e.target.value.toUpperCase() 
                            : e.target.value;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Document File</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-volt-light transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="document-upload"
                    data-testid="input-document-file"
                  />
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : "Click to upload document"}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      JPEG, PNG, or PDF up to 5MB
                    </p>
                  </label>
                </div>

              </div>

              <Button 
                type="submit" 
                className="w-full volt-gradient text-white"
                disabled={!selectedFile || submitKycMutation.isPending || updateKycMutation.isPending}
                data-testid="button-submit-kyc"
              >
                {(submitKycMutation.isPending || updateKycMutation.isPending) ? "Processing..." : "Submit Document"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Document Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {documentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.value} className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="h-5 w-5 text-volt-light" />
                    <h3 className="font-medium">{type.label}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-1">
                    <li>• Clear and readable image</li>
                    <li>• All corners visible</li>
                    <li>• No glare or shadows</li>
                    <li>• File size under 5MB</li>
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}