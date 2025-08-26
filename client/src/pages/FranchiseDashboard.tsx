import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Package, TrendingUp, Users, DollarSign, BarChart3, Settings, Menu, X } from "lucide-react";
import { Link } from "wouter";
import VoltverashopLogo from "@/components/VoltverashopLogo";

export default function FranchiseDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Redirect if not authenticated or not franchise
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !['mini_franchise', 'basic_franchise'].includes(user?.role || ''))) {
      toast({
        title: "Unauthorized",
        description: "Franchise access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !['mini_franchise', 'basic_franchise'].includes(user?.role || '')) {
    return null;
  }

  // Color theme based on franchise type
  const themeConfig = user?.role === 'mini_franchise' 
    ? {
        gradient: 'from-green-900 via-emerald-900 to-green-800',
        primary: 'green-500',
        secondary: 'emerald-400',
        badge: 'Mini Franchise',
        badgeColor: 'bg-green-400/20 text-green-300 border-green-400/30'
      }
    : {
        gradient: 'from-blue-900 via-indigo-900 to-blue-800',
        primary: 'blue-500',
        secondary: 'indigo-400',
        badge: 'Basic Franchise',
        badgeColor: 'bg-blue-400/20 text-blue-300 border-blue-400/30'
      };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Franchise Dashboard',
      icon: BarChart3,
      description: 'Overview & stats'
    },
    {
      id: 'inventory',
      label: 'Stock Management',
      icon: Package,
      description: 'Product inventory'
    },
    {
      id: 'sales',
      label: 'Local Sales',
      icon: TrendingUp,
      description: 'Sales reports'
    },
    {
      id: 'customers',
      label: 'Customer Management',
      icon: Users,
      description: 'Local customers'
    }
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${themeConfig.gradient}`}>
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
                  <Store className={`h-5 w-5 text-${themeConfig.secondary}`} />
                  <span className="text-lg font-bold text-white">Franchise Portal</span>
                  <Badge variant="secondary" className={themeConfig.badgeColor}>
                    {themeConfig.badge}
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
            <span className="text-white font-semibold">Franchise Menu</span>
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
                    ? `bg-gradient-to-r from-${themeConfig.primary}/20 to-${themeConfig.secondary}/20 text-white border border-${themeConfig.secondary}/30` 
                    : 'hover:bg-white/10 text-white/90 border border-transparent'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 text-${themeConfig.secondary}`} />
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
                <Store className={`h-8 w-8 text-${themeConfig.secondary}`} />
                <div>
                  <h1 className="text-3xl font-bold text-white">{themeConfig.badge} Dashboard</h1>
                  <p className="text-white/70">Manage your franchise operations</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Monthly Sales</p>
                        <p className="text-2xl font-bold text-white">$12,340</p>
                      </div>
                      <DollarSign className={`h-8 w-8 text-${themeConfig.secondary}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Stock Items</p>
                        <p className="text-2xl font-bold text-white">248</p>
                      </div>
                      <Package className={`h-8 w-8 text-${themeConfig.secondary}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Customers</p>
                        <p className="text-2xl font-bold text-white">156</p>
                      </div>
                      <Users className={`h-8 w-8 text-${themeConfig.secondary}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Growth</p>
                        <p className="text-2xl font-bold text-green-400">+18%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Franchise Features */}
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Store className={`mr-2 h-5 w-5 text-${themeConfig.secondary}`} />
                    {themeConfig.badge} Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user?.role === 'mini_franchise' ? (
                      <>
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                          <h3 className="text-white font-medium">Limited SKU Range</h3>
                          <p className="text-white/70 text-sm">Access to essential product categories</p>
                        </div>
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                          <h3 className="text-white font-medium">Local Market Focus</h3>
                          <p className="text-white/70 text-sm">Targeted local sales operations</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <h3 className="text-white font-medium">Extended Product Range</h3>
                          <p className="text-white/70 text-sm">Access to wider product catalog</p>
                        </div>
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <h3 className="text-white font-medium">Enhanced Bonus Structure</h3>
                          <p className="text-white/70 text-sm">Higher commission rates and bonuses</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Package className={`h-8 w-8 text-${themeConfig.secondary}`} />
                <div>
                  <h1 className="text-3xl font-bold text-white">Stock Management</h1>
                  <p className="text-white/70">Manage your franchise inventory</p>
                </div>
              </div>
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardContent className="p-6">
                  <p className="text-white/70">Stock management features coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'sales' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <TrendingUp className={`h-8 w-8 text-${themeConfig.secondary}`} />
                <div>
                  <h1 className="text-3xl font-bold text-white">Local Sales Report</h1>
                  <p className="text-white/70">Track your franchise performance</p>
                </div>
              </div>
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardContent className="p-6">
                  <p className="text-white/70">Sales reporting features coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}