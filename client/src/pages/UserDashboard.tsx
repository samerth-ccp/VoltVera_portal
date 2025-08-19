import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Leaf, BarChart3, Smartphone, Target, Bell, Lock, Users, Home, Settings } from "lucide-react";
import { Link } from "wouter";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import MyTeam from "./MyTeam";

function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || 'U';
}

export default function UserDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');

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
      {/* Header */}
      <header className="volt-gradient text-white">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center space-x-4">
            <VoltverashopLogo size="small" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Voltverashop Portal</h1>
              <p className="text-white/80 text-sm hidden sm:block">
                Welcome back, {user?.firstName || 'User'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 hidden sm:block">
              <Bell className="h-4 w-4" />
            </Button>
            <Link href="/change-password">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                <Lock className="h-4 w-4" />
              </Button>
            </Link>
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
                fetch('/api/logout', { method: 'POST', credentials: 'include' })
                  .then(() => window.location.href = '/');
              }}
            >
              🚪
            </Button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-t border-white/10">
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
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Welcome Section */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Your Portal</h2>
                <p className="text-gray-600 mb-6">
                  Access your sustainable energy solutions and track your impact with Voltverashop.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 volt-gradient rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                      <Zap className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Energy Usage</h3>
                    <p className="text-gray-600 text-sm">Monitor your consumption</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 volt-gradient rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                      <Leaf className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Sustainability</h3>
                    <p className="text-gray-600 text-sm">Track your green impact</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 volt-gradient rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                      <BarChart3 className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Reports</h3>
                    <p className="text-gray-600 text-sm">View detailed analytics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions and Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-4 bg-gray-50 hover:bg-volt-light hover:text-white transition-all duration-300"
                  >
                    <Zap className="mr-3 h-4 w-4" />
                    View Energy Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-4 bg-gray-50 hover:bg-volt-light hover:text-white transition-all duration-300"
                    onClick={() => setActiveTab('team')}
                  >
                    <Users className="mr-3 h-4 w-4" />
                    Manage My Team
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-4 bg-gray-50 hover:bg-volt-light hover:text-white transition-all duration-300"
                  >
                    <Target className="mr-3 h-4 w-4" />
                    Set Sustainability Goals
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-volt-light rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">Profile updated successfully</p>
                      <p className="text-xs text-gray-500">Welcome to Voltverashop!</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">Account activated</p>
                      <p className="text-xs text-gray-500">Ready to start your journey</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">Welcome email sent</p>
                      <p className="text-xs text-gray-500">Check your inbox for details</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === 'team' && <MyTeam />}
        
        {activeTab === 'settings' && (
          <div className="p-4 sm:p-6 lg:p-8">
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
                      <Link href="/change-password">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Lock className="mr-2 h-4 w-4" />
                          Change Password
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          fetch('/api/logout', { method: 'POST', credentials: 'include' })
                            .then(() => window.location.href = '/');
                        }}
                      >
                        🚪 Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
