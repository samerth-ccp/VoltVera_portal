import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Shield, Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface UserKYCData {
  kycId: string;
  userId: string;
  userUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  userStatus: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  documents: {
    panCard: { url: string; number: string; status: string };
    aadhaarCard: { url: string; number: string; status: string };
    bankStatement: { url: string; status: string };
    photo: { url: string; status: string };
  };
}

interface KYCDocument {
  id: string;
  documentType: string;
  documentData: string;
  documentContentType: string;
  documentFilename: string;
  documentSize: number;
  documentNumber: string;
  status: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}



// Pending KYC Section
export const PendingKYCSection: React.FC = () => {
  const [userKYCData, setUserKYCData] = useState<UserKYCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<{ [userId: string]: KYCDocument[] }>({});
  const [loadingDocuments, setLoadingDocuments] = useState<{ [userId: string]: boolean }>({});

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  // Fetch documents for a specific user
  const fetchUserDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(prev => ({ ...prev, [userId]: true }));
      const response = await fetch(`/api/admin/kyc/${userId}/documents`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(prev => ({ ...prev, [userId]: docs }));
      } else {
        console.error('Failed to fetch documents:', response.statusText);
        setDocuments(prev => ({ ...prev, [userId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [userId]: false }));
    }
  };

  const fetchPendingKYC = async () => {
    try {
      console.log('🔍 Fetching KYC documents...');
      const response = await fetch('/api/admin/kyc');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Log the raw response text to see what's being returned
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('📄 Full response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('📊 KYC data received:', data);
      
      // Filter users with pending KYC status
      const pendingUsers = data.filter((user: UserKYCData) => user.kycStatus === 'pending');
      console.log('⏳ Users with pending KYC:', pendingUsers);
      
      setUserKYCData(pendingUsers);
    } catch (error) {
      console.error('Error fetching pending KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKYCStatus = async (documentId: string, status: 'pending' | 'approved' | 'rejected', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/kyc/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: reason })
      });

      if (response.ok) {
        // Refresh the list
        fetchPendingKYC();
        // Show success message
        alert(`KYC document ${status} successfully!`);
      } else {
        alert('Failed to update KYC status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      alert('Error updating KYC status. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (userKYCData.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending KYC Requests</h3>
        <p className="text-gray-600">
          {loading ? 'Loading...' : 'No users with pending KYC found. This could mean:\n1. No users have registered with KYC documents yet\n2. All KYC documents have been reviewed\n3. There might be a database connection issue'}
        </p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Check the browser console for debugging information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">User ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Documents</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Submitted</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userKYCData.map((userData) => (
              <tr key={userData.userId} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {userData.userUserId}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {userData.firstName} {userData.lastName}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {userData.email}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="space-y-1 text-sm">
                    {userData.documents.panCard.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">PAN:</span>
                        <span className="text-gray-600">{userData.documents.panCard.number}</span>
                      </div>
                    )}
                    {userData.documents.aadhaarCard.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Aadhaar:</span>
                        <span className="text-gray-600">{userData.documents.aadhaarCard.number}</span>
                      </div>
                    )}
                    {userData.documents.bankStatement.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bank Statement:</span>
                        <span className="text-gray-600">✓</span>
                      </div>
                    )}
                    {userData.documents.photo.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Photo:</span>
                        <span className="text-gray-600">✓</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                  {new Date(userData.createdAt).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!documents[userData.userId]) {
                          fetchUserDocuments(userData.userId);
                        } else {
                          // View all documents
                          const userDocs = documents[userData.userId];
                          userDocs.forEach(doc => {
                            if (doc.documentData) {
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
                          });
                        }
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      disabled={loadingDocuments[userData.userId]}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {loadingDocuments[userData.userId] ? 'Loading...' : 'View All'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateKYCStatus(userData.kycId, 'approved')}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const reason = prompt('Please provide rejection reason:');
                        if (reason) {
                          updateKYCStatus(userData.kycId, 'rejected', reason);
                        }
                      }}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Approved KYC Section
export const ApprovedKYCSection: React.FC = () => {
  const [userKYCData, setUserKYCData] = useState<UserKYCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<{ [userId: string]: KYCDocument[] }>({});
  const [loadingDocuments, setLoadingDocuments] = useState<{ [userId: string]: boolean }>({});

  useEffect(() => {
    fetchApprovedKYC();
  }, []);

  // Fetch documents for a specific user
  const fetchUserDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(prev => ({ ...prev, [userId]: true }));
      const response = await fetch(`/api/admin/kyc/${userId}/documents`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(prev => ({ ...prev, [userId]: docs }));
      } else {
        console.error('Failed to fetch documents:', response.statusText);
        setDocuments(prev => ({ ...prev, [userId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [userId]: false }));
    }
  };

  const fetchApprovedKYC = async () => {
    try {
      console.log('🔍 Fetching approved KYC documents...');
      const response = await fetch('/api/admin/kyc');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Log the raw response text to see what's being returned
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('📄 Full response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('📊 Approved KYC data received:', data);
      
      // Filter users with approved KYC status
      const approvedUsers = data.filter((user: UserKYCData) => user.kycStatus === 'approved');
      console.log('✅ Users with approved KYC:', approvedUsers);
      
      setUserKYCData(approvedUsers);
    } catch (error) {
      console.error('Error fetching approved KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKYCStatus = async (documentId: string, status: 'pending' | 'approved' | 'rejected', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/kyc/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: reason })
      });

      if (response.ok) {
        // Refresh the list
        fetchApprovedKYC();
        // Show success message
        alert(`KYC document ${status} successfully!`);
      } else {
        alert('Failed to update KYC status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      alert('Error updating KYC status. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (userKYCData.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Approved KYC Documents</h3>
        <p className="text-gray-600">
          {loading ? 'Loading...' : 'No users with approved KYC found. This could mean:\n1. No users have registered with KYC documents yet\n2. No KYC documents have been approved yet\n3. There might be a database connection issue'}
        </p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Check the browser console for debugging information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">User ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Documents</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Approved</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userKYCData.map((userData) => (
              <tr key={userData.userId} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {userData.userUserId}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {userData.firstName} {userData.lastName}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {userData.email}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="space-y-1 text-sm">
                    {userData.documents.panCard.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">PAN:</span>
                        <span className="text-gray-600">{userData.documents.panCard.number}</span>
                      </div>
                    )}
                    {userData.documents.aadhaarCard.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Aadhaar:</span>
                        <span className="text-gray-600">{userData.documents.aadhaarCard.number}</span>
                      </div>
                    )}
                    {userData.documents.bankStatement.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bank Statement:</span>
                        <span className="text-gray-600">✓</span>
                      </div>
                    )}
                    {userData.documents.photo.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Photo:</span>
                        <span className="text-gray-600">✓</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                  {userData.reviewedAt ? new Date(userData.reviewedAt).toLocaleDateString() : new Date(userData.updatedAt).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!documents[userData.userId]) {
                          fetchUserDocuments(userData.userId);
                        } else {
                          // View all documents
                          const userDocs = documents[userData.userId];
                          userDocs.forEach(doc => {
                            if (doc.documentData) {
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
                          });
                        }
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      disabled={loadingDocuments[userData.userId]}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {loadingDocuments[userData.userId] ? 'Loading...' : 'View All'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Rejected KYC Section
export const RejectedKYCSection: React.FC = () => {
  const [userKYCData, setUserKYCData] = useState<UserKYCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<{ [userId: string]: KYCDocument[] }>({});
  const [loadingDocuments, setLoadingDocuments] = useState<{ [userId: string]: boolean }>({});

  useEffect(() => {
    fetchRejectedKYC();
  }, []);

  // Fetch documents for a specific user
  const fetchUserDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(prev => ({ ...prev, [userId]: true }));
      const response = await fetch(`/api/admin/kyc/${userId}/documents`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(prev => ({ ...prev, [userId]: docs }));
      } else {
        console.error('Failed to fetch documents:', response.statusText);
        setDocuments(prev => ({ ...prev, [userId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments(prev => ({ ...prev, [userId]: [] }));
    } finally {
      setLoadingDocuments(prev => ({ ...prev, [userId]: false }));
    }
  };

  const fetchRejectedKYC = async () => {
    try {
      console.log('🔍 Fetching rejected KYC documents...');
      const response = await fetch('/api/admin/kyc');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Log the raw response text to see what's being returned
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText.substring(0, 200) + '...');
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('📄 Full response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      // Filter users with rejected KYC status
      const rejectedUsers = data.filter((user: UserKYCData) => user.kycStatus === 'rejected');
      console.log('❌ Users with rejected KYC:', rejectedUsers);
      
      setUserKYCData(rejectedUsers);
    } catch (error) {
      console.error('Error fetching rejected KYC:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (userKYCData.length === 0) {
    return (
      <div className="text-center py-8">
        <XCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Rejected KYC Documents</h3>
        <p className="text-gray-600">No users have rejected KYC documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">User ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Documents</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Rejection Reason</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Rejected</th>
              <th className="border border-gray-300 px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userKYCData.map((userData) => (
              <tr key={userData.userId} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {userData.userUserId}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {userData.firstName} {userData.lastName}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {userData.email}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="space-y-1 text-sm">
                    {userData.documents.panCard.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">PAN:</span>
                        <span className="text-gray-600">{userData.documents.panCard.number}</span>
                      </div>
                    )}
                    {userData.documents.aadhaarCard.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Aadhaar:</span>
                        <span className="text-gray-600">{userData.documents.aadhaarCard.number}</span>
                      </div>
                    )}
                    {userData.documents.bankStatement.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Bank Statement:</span>
                        <span className="text-gray-600">✓</span>
                      </div>
                    )}
                    {userData.documents.photo.url && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Photo:</span>
                        <span className="text-gray-600">✓</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Rejected
                  </Badge>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                  {userData.rejectionReason || 'No reason provided'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                  {userData.reviewedAt ? new Date(userData.reviewedAt).toLocaleDateString() : new Date(userData.updatedAt).toLocaleDateString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!documents[userData.userId]) {
                          fetchUserDocuments(userData.userId);
                        } else {
                          // View all documents
                          const userDocs = documents[userData.userId];
                          userDocs.forEach(doc => {
                            if (doc.documentData) {
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
                          });
                        }
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      disabled={loadingDocuments[userData.userId]}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {loadingDocuments[userData.userId] ? 'Loading...' : 'View All'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
