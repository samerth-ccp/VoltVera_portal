import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Leaf, BarChart3, Smartphone, Target, Bell, Lock, Users, Home, Settings, ShoppingCart, Package, Shield, Eye, CheckCircle, XCircle, Clock, Upload, Menu, X, DollarSign, ArrowUpRight, TrendingUp, Wallet, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import MyTeam from "./MyTeam";
import ProductCatalog from "./ProductCatalog";
import MyPurchases from "./MyPurchases";
import { NotificationCenter } from "@/components/NotificationCenter";
import RequestFundsForm from "@/components/RequestFundsForm";
import FundRequestHistory from "@/components/FundRequestHistory";
import WithdrawalRequestForm from "@/components/WithdrawalRequestForm";
import WithdrawalHistory from "@/components/WithdrawalHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamBusinessStages } from "@/components/TeamBusinessStages";
import { useQuery } from "@tanstack/react-query";

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || 'U';
}

// User KYC Section Component
function UserKYCSection() {
  const [kycInfo, setKycInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKYCInfo();
  }, []);

  const fetchKYCInfo = async () => {
    try {
      // Get impersonation token if available
      const impersonationToken = sessionStorage.getItem('impersonationToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (impersonationToken) {
        headers['Authorization'] = `Bearer ${impersonationToken}`;
      }
      
      const response = await fetch('/api/user/kyc-info', {
        credentials: 'include',
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setKycInfo(data);
      }
    } catch (error) {
      console.error('Error fetching KYC info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Enhanced document viewing function
  const handleViewDocument = async (document: any, documentType: string) => {
    try {
      console.log(`🔍 Viewing ${documentType} document:`, {
        hasDocumentData: !!document.documentData,
        hasUrl: !!document.url,
        documentType: document.documentType
      });

      if (document.documentData) {
        // Handle base64 embedded data
        const dataUrl = `data:${document.documentType || 'application/pdf'};base64,${document.documentData}`;
        console.log(`📄 Opening base64 document for ${documentType}`);
        
        // Convert to blob for better browser compatibility
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          alert('Please allow popups to view documents.');
        } else {
          console.log(`✅ Successfully opened ${documentType} document`);
        }
      } else if (document.url && document.url !== 'data:image/jpeg;base64,placeholder') {
        // Handle URL-based documents (legacy format)
        console.log(`🔗 Opening URL-based document for ${documentType}`);
        
        if (document.url.startsWith('data:')) {
          // It's a data URL, convert to blob and open
          const response = await fetch(document.url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const newWindow = window.open(blobUrl, '_blank');
          if (!newWindow) {
            alert('Please allow popups to view documents.');
          } else {
            console.log(`✅ Successfully opened ${documentType} document from data URL`);
          }
        } else {
          // It's a regular URL, open directly
          const newWindow = window.open(document.url, '_blank');
          if (!newWindow) {
            alert('Please allow popups to view documents.');
          } else {
            console.log(`✅ Successfully opened ${documentType} document from URL`);
          }
        }
      } else {
        console.warn(`No document data or URL available for ${documentType}`);
        alert(`No document available for ${documentType}. Please upload a document first.`);
      }
    } catch (error) {
      console.error(`Error viewing ${documentType} document:`, error);
      alert(`Error opening ${documentType} document. Please try again.`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            KYC Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading KYC information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          KYC Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall KYC Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Overall KYC Status</h3>
            {getStatusBadge(kycInfo?.overallStatus || 'pending')}
          </div>
          {kycInfo?.overallReason && (
            <p className="text-sm text-gray-600">{kycInfo.overallReason}</p>
          )}
          {kycInfo?.lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(kycInfo.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Individual Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PAN Card */}
          <div className="p-4 border rounded-lg min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">PAN Card</h4>
              {getStatusBadge(kycInfo?.documents?.panCard?.status || 'pending')}
            </div>
            <div className="mt-auto">
              {(kycInfo?.documents?.panCard?.url || kycInfo?.documents?.panCard?.documentData) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDocument(kycInfo.documents.panCard, 'PAN Card')}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Document
                </Button>
              )}
              {kycInfo?.documents?.panCard?.reason && (
                <p className="text-xs text-red-600 mt-2">{kycInfo.documents.panCard.reason}</p>
              )}
            </div>
          </div>

          {/* Aadhaar Front */}
          <div className="p-4 border rounded-lg min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">Aadhaar Front</h4>
              {getStatusBadge(kycInfo?.documents?.aadhaarFront?.status || 'pending')}
            </div>
            <div className="mt-auto">
              {(kycInfo?.documents?.aadhaarFront?.url || kycInfo?.documents?.aadhaarFront?.documentData) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDocument(kycInfo.documents.aadhaarFront, 'Aadhaar Front')}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Document
                </Button>
              )}
              {kycInfo?.documents?.aadhaarFront?.reason && (
                <p className="text-xs text-red-600 mt-2">{kycInfo.documents.aadhaarFront.reason}</p>
              )}
            </div>
          </div>

          {/* Aadhaar Back */}
          <div className="p-4 border rounded-lg min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">Aadhaar Back</h4>
              {getStatusBadge(kycInfo?.documents?.aadhaarBack?.status || 'pending')}
            </div>
            <div className="mt-auto">
              {(kycInfo?.documents?.aadhaarBack?.url || kycInfo?.documents?.aadhaarBack?.documentData) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDocument(kycInfo.documents.aadhaarBack, 'Aadhaar Back')}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Document
                </Button>
              )}
              {kycInfo?.documents?.aadhaarBack?.reason && (
                <p className="text-xs text-red-600 mt-2">{kycInfo.documents.aadhaarBack.reason}</p>
              )}
            </div>
          </div>

          {/* Bank Statement */}
          <div className="p-4 border rounded-lg min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">Bank Statement</h4>
              {getStatusBadge(kycInfo?.documents?.bankStatement?.status || 'pending')}
            </div>
            <div className="mt-auto">
              {(kycInfo?.documents?.bankStatement?.url || kycInfo?.documents?.bankStatement?.documentData) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDocument(kycInfo.documents.bankStatement, 'Bank Statement')}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Document
                </Button>
              )}
              {kycInfo?.documents?.bankStatement?.reason && (
                <p className="text-xs text-red-600 mt-2">{kycInfo.documents.bankStatement.reason}</p>
              )}
            </div>
          </div>

          {/* Photo */}
          <div className="p-4 border rounded-lg min-h-[120px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">Profile Photo</h4>
              {getStatusBadge(kycInfo?.documents?.photo?.status || 'pending')}
            </div>
            <div className="mt-auto">
              {(kycInfo?.documents?.photo?.url || kycInfo?.documents?.photo?.documentData) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDocument(kycInfo.documents.photo, 'Profile Photo')}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Document
                </Button>
              )}
              {kycInfo?.documents?.photo?.reason && (
                <p className="text-xs text-red-600 mt-2">{kycInfo.documents.photo.reason}</p>
              )}
            </div>
          </div>
        </div>

        {/* Update Documents Button */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              // Navigate to KYC upload page
              window.location.href = '/kyc-upload';
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Update KYC Documents
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Click to upload or replace your KYC documents
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Wallet Balance Component
function WalletBalanceCard() {
  const { data: wallet, isLoading } = useQuery<{
    balance: string;
    totalEarnings: string;
    totalWithdrawals: string;
  }>({
    queryKey: ['/api/wallet'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            E-Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading wallet...</div>
        </CardContent>
      </Card>
    );
  }

  const balance = parseFloat(wallet?.balance || '0');
  const totalEarnings = parseFloat(wallet?.totalEarnings || '0');
  const totalWithdrawals = parseFloat(wallet?.totalWithdrawals || '0');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardTitle className="flex items-center text-xl">
          <Wallet className="mr-2 h-6 w-6" />
          E-Wallet Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Balance */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-green-600" data-testid="text-wallet-balance">
              ₹{balance.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Available for purchases</p>
          </div>

          {/* Total Earnings */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-blue-600" data-testid="text-total-earnings">
              ₹{totalEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">All-time income</p>
          </div>

          {/* Total Withdrawals */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Withdrawals</p>
            <p className="text-2xl font-bold text-orange-600" data-testid="text-total-withdrawals">
              ₹{totalWithdrawals.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total withdrawn</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  usePageTitle("Dashboard", "Your VoltveraShop dashboard and MLM network overview");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Please log in",
        description: "Redirecting to login page...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <VoltverashopLogo />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Redirect admin users to admin dashboard
  if (user?.role === 'admin') {
    window.location.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 volt-gradient text-white z-30 transform transition-transform lg:hidden ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 border-b border-white/20 px-4">
          <div className="flex items-center">
            <VoltverashopLogo size="small" />
            <div className="ml-3">
              <div className="text-lg font-bold">Voltverashop</div>
              <div className="text-xs text-white/70">User Portal</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Button
            variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('dashboard');
              setIsSidebarOpen(false);
            }}
          >
            <Home className="mr-3 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'team' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('team');
              setIsSidebarOpen(false);
            }}
          >
            <Users className="mr-3 h-4 w-4" />
            My Team
          </Button>
          <Button
            variant={activeTab === 'products' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('products');
              setIsSidebarOpen(false);
            }}
          >
            <ShoppingCart className="mr-3 h-4 w-4" />
            Products
          </Button>
          <Button
            variant={activeTab === 'purchases' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('purchases');
              setIsSidebarOpen(false);
            }}
          >
            <Package className="mr-3 h-4 w-4" />
            My Purchases
          </Button>
          <Link href="/bv-calculations">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:text-gray-900"
              onClick={() => setIsSidebarOpen(false)}
              data-testid="link-bv-calculations"
            >
              <TrendingUp className="mr-3 h-4 w-4" />
              BV Calculations
            </Button>
          </Link>
          <Button
            variant={activeTab === 'deposits' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('deposits');
              setIsSidebarOpen(false);
            }}
          >
            <DollarSign className="mr-3 h-4 w-4" />
            Deposits
          </Button>
          <Button
            variant={activeTab === 'withdraw' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('withdraw');
              setIsSidebarOpen(false);
            }}
          >
            <ArrowUpRight className="mr-3 h-4 w-4" />
            Withdraw
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
            className="w-full justify-start text-white hover:text-gray-900"
            onClick={() => {
              setActiveTab('settings');
              setIsSidebarOpen(false);
            }}
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>
        </nav>
      </div>

      {/* Header */}
      <header className="volt-gradient text-white">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <VoltverashopLogo size="small" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Voltverashop Portal</h1>
              <p className="text-white/80 text-sm hidden sm:block">
                Welcome back, {user?.firstName || 'User'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <NotificationCenter />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <span className="text-white font-medium hidden sm:block">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => {
                logout();
              }}
            >
              🚪
            </Button>
          </div>
        </div>
        
        {/* Desktop Navigation Tabs */}
        <div className="border-t border-white/10 hidden lg:block">
          <div className="px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'team'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <Users className="mr-2 h-4 w-4" />
                My Team
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'products'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Products
              </button>
              <button
                onClick={() => setActiveTab('purchases')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'purchases'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <Package className="mr-2 h-4 w-4" />
                My Purchases
              </button>
              <button
                onClick={() => setActiveTab('deposits')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'deposits'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Deposits
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'withdraw'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'border-white text-white'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="min-h-screen bg-gray-50">
        {activeTab === 'dashboard' && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <WalletBalanceCard />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Team Business Stages</h1>
              <TeamBusinessStages />
            </div>
          </div>
        )}
        
        {activeTab === 'team' && <MyTeam />}
        
        {activeTab === 'products' && <ProductCatalog />}
        
        {activeTab === 'purchases' && <MyPurchases />}
        
        {activeTab === 'deposits' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <Tabs defaultValue="request" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="request">Request Funds</TabsTrigger>
                <TabsTrigger value="history">Fund Request History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="request" className="mt-6">
                <RequestFundsForm />
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <FundRequestHistory />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {activeTab === 'withdraw' && (
          <div className="p-4 sm:p-6 lg:p-8">
            <Tabs defaultValue="request" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="request">Withdrawal Request</TabsTrigger>
                <TabsTrigger value="history">Withdrawal History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="request" className="mt-6">
                <WithdrawalRequestForm />
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <WithdrawalHistory />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Profile Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
                      <p><span className="font-medium">Email:</span> {user?.email}</p>
                      <p><span className="font-medium">Status:</span> <span className="text-green-600 capitalize">{user?.status}</span></p>
                      <p><span className="font-medium">Role:</span> <span className="capitalize">{user?.role}</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Account Actions</h3>
                    <div className="space-y-2">
                      {/* Hidden for now - Change password functionality */}
                      {/* <Link href="/change-password">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Lock className="mr-2 h-4 w-4" />
                          Change Password
                        </Button>
                      </Link> */}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          logout();
                        }}
                      >
                        🚪 Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KYC Information Section */}
            <UserKYCSection />
          </div>
        )}
      </div>
    </div>
  );
}
