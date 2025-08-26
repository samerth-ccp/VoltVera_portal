import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Eye, EyeOff, Users, BarChart3, DollarSign, TrendingUp, ArrowLeftRight, Plus, Settings, Menu, X, Zap } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import VoltverashopLogo from "@/components/VoltverashopLogo";

interface FounderStats {
  totalUsers: number;
  hiddenIds: number;
  totalRevenue: string;
  networkBalance: string;
  leftLegUsers: number;
  rightLegUsers: number;
}

export default function FounderDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHiddenIds, setShowHiddenIds] = useState(false);
  const [isCreateHiddenIdOpen, setIsCreateHiddenIdOpen] = useState(false);

  // Redirect if not authenticated or not founder
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'founder')) {
      toast({
        title: "Unauthorized",
        description: "Founder access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch founder stats
  const { data: stats, isLoading: statsLoading } = useQuery<FounderStats>({
    queryKey: ['/api/founder/stats'],
    enabled: isAuthenticated && user?.role === 'founder',
  });

  // Fetch hidden IDs
  const { data: hiddenIds, isLoading: hiddenIdsLoading } = useQuery<User[]>({
    queryKey: ['/api/founder/hidden-ids'],
    enabled: isAuthenticated && user?.role === 'founder' && showHiddenIds,
  });

  // Create hidden ID mutation
  const createHiddenIdMutation = useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; placementSide: string }) => {
      return apiRequest('/api/founder/create-hidden-id', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hidden ID created successfully",
      });
      setIsCreateHiddenIdOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/founder'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create hidden ID",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'founder') {
    return null;
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Founder Control Center',
      icon: Crown,
      description: 'God mode overview'
    },
    {
      id: 'hidden-ids',
      label: 'Hidden IDs Management',
      icon: Eye,
      description: '20 invisible accounts'
    },
    {
      id: 'network-control',
      label: 'Network Override',
      icon: ArrowLeftRight,
      description: 'Manual BV & placement control'
    },
    {
      id: 'franchise-master',
      label: 'Franchise Master Control',
      icon: Shield,
      description: 'Override franchise decisions'
    },
    {
      id: 'financial-override',
      label: 'Financial Override',
      icon: DollarSign,
      description: 'Adjust balances & income'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <VoltverashopLogo className="h-8 w-auto" />
                <div className="ml-4 flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-400" />
                  <span className="text-lg font-bold text-white">Founder Portal</span>
                  <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                    GOD MODE
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white/80">Welcome back,</span>
              <span className="text-white font-semibold">{user?.firstName}</span>
              <Link href="/api/logout">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-black/30 backdrop-blur-sm border-r border-white/10`}>
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="text-white font-semibold">Founder Menu</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center w-full p-4 text-left rounded-lg transition-all ${
                  activeSection === item.id 
                    ? 'bg-gradient-to-r from-yellow-400/20 to-purple-400/20 text-white border border-yellow-400/30' 
                    : 'hover:bg-white/10 text-white/90 border border-transparent'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5 text-yellow-400" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-white/60">{item.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Crown className="h-8 w-8 text-yellow-400" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Founder Control Center</h1>
                  <p className="text-white/70">Complete network oversight with invisible privileges</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Total Network</p>
                        <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Hidden IDs</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats?.hiddenIds || 0}/20</p>
                      </div>
                      <Eye className="h-8 w-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Global Revenue</p>
                        <p className="text-2xl font-bold text-green-400">${stats?.totalRevenue || '0'}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Network Balance</p>
                        <p className="text-lg font-bold text-white">
                          L: {stats?.leftLegUsers || 0} | R: {stats?.rightLegUsers || 0}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="mr-2 h-5 w-5 text-yellow-400" />
                    Founder Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      onClick={() => setActiveSection('hidden-ids')}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Manage Hidden IDs
                    </Button>
                    <Button 
                      onClick={() => setActiveSection('network-control')}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      Network Override
                    </Button>
                    <Button 
                      onClick={() => setActiveSection('financial-override')}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Financial Control
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'hidden-ids' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Eye className="h-8 w-8 text-yellow-400" />
                  <div>
                    <h1 className="text-3xl font-bold text-white">Hidden IDs Management</h1>
                    <p className="text-white/70">20 invisible accounts for network balancing</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => setShowHiddenIds(!showHiddenIds)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    {showHiddenIds ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showHiddenIds ? 'Hide IDs' : 'Show Hidden IDs'}
                  </Button>
                  <Button 
                    onClick={() => setIsCreateHiddenIdOpen(true)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Hidden ID
                  </Button>
                </div>
              </div>

              {showHiddenIds && (
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Active Hidden IDs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hiddenIdsLoading ? (
                      <p className="text-white/70">Loading hidden IDs...</p>
                    ) : hiddenIds && hiddenIds.length > 0 ? (
                      <div className="space-y-3">
                        {hiddenIds.map((hiddenId) => (
                          <div key={hiddenId.id} className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-yellow-400/20">
                            <div>
                              <p className="text-white font-medium">{hiddenId.firstName} {hiddenId.lastName}</p>
                              <p className="text-white/60 text-sm">{hiddenId.email}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-300">
                                Hidden
                              </Badge>
                              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                Manage
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/70">No hidden IDs created yet.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Other sections would be implemented similarly */}
          {activeSection === 'network-control' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <ArrowLeftRight className="h-8 w-8 text-blue-400" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Network Override Control</h1>
                  <p className="text-white/70">Manual BV and placement control</p>
                </div>
              </div>
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardContent className="p-6">
                  <p className="text-white/70">Network override features coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Create Hidden ID Dialog */}
      <Dialog open={isCreateHiddenIdOpen} onOpenChange={setIsCreateHiddenIdOpen}>
        <DialogContent className="bg-black/90 backdrop-blur-sm border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Eye className="mr-2 h-5 w-5 text-yellow-400" />
              Create New Hidden ID
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            createHiddenIdMutation.mutate({
              email: formData.get('email') as string,
              firstName: formData.get('firstName') as string,
              lastName: formData.get('lastName') as string,
              placementSide: formData.get('placementSide') as string,
            });
          }} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                required 
                className="bg-black/50 border-white/20 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white">First Name</Label>
                <Input 
                  id="firstName" 
                  name="firstName" 
                  required 
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-white">Last Name</Label>
                <Input 
                  id="lastName" 
                  name="lastName" 
                  required 
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="placementSide" className="text-white">Placement Side</Label>
              <Select name="placementSide" required>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="Select placement side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left Leg</SelectItem>
                  <SelectItem value="right">Right Leg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateHiddenIdOpen(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createHiddenIdMutation.isPending}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                {createHiddenIdMutation.isPending ? 'Creating...' : 'Create Hidden ID'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}