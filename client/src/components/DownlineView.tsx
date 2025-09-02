import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  UserCheck, 
  TrendingUp,
  DollarSign,
  TreePine,
  BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DownlineUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  userId: string | null;
  packageAmount: string | null;
  idStatus: string | null;
  position: string | null;
  level: string | null;
  registrationDate: string | null;
  activationDate: string | null;
  leftBV: string | null;
  rightBV: string | null;
  totalBV: string | null;
  sponsorId: string | null;
  parentId: string | null;
}

interface DownlineLevel {
  level: number;
  users: DownlineUser[];
  totalUsers: number;
  totalBV: string;
  activeUsers: number;
}

export function DownlineView() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set([0, 1]));

  // Fetch downline data
  const { data: downline = [], isLoading } = useQuery<DownlineUser[]>({
    queryKey: ["/api/team/downline", { levels: 10 }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/team/downline?levels=10');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch team stats
  const { data: stats } = useQuery<{
    directRecruits: number;
    totalDownline: number;
    activeMembers: number;
  }>({
    queryKey: ["/api/team/stats"],
    enabled: !!user,
  });

  // Organize downline by levels
  const downlineByLevels = downline.reduce((acc: DownlineLevel[], user) => {
    const level = parseInt(user.level || '0');
    let levelData = acc.find(l => l.level === level);
    
    if (!levelData) {
      levelData = {
        level,
        users: [],
        totalUsers: 0,
        totalBV: '0.00',
        activeUsers: 0
      };
      acc.push(levelData);
    }
    
    levelData.users.push(user);
    levelData.totalUsers++;
    levelData.totalBV = (parseFloat(levelData.totalBV) + parseFloat(user.totalBV || '0')).toFixed(2);
    if (user.idStatus === 'Active') levelData.activeUsers++;
    
    return acc;
  }, []).sort((a, b) => a.level - b.level);

  // Filter downline based on search and filters
  const filteredDownline = downline.filter(user => {
    const matchesSearch = !search || 
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.userId?.toLowerCase().includes(search.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || user.level === levelFilter;
    const matchesStatus = statusFilter === 'all' || user.idStatus === statusFilter;
    
    return matchesSearch && matchesLevel && matchesStatus;
  });

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const getLevelStats = (level: number) => {
    const levelUsers = downline.filter(u => parseInt(u.level || '0') === level);
    const totalBV = levelUsers.reduce((sum, u) => sum + parseFloat(u.totalBV || '0'), 0);
    const activeUsers = levelUsers.filter(u => u.idStatus === 'Active').length;
    
    return {
      totalUsers: levelUsers.length,
      totalBV: totalBV.toFixed(2),
      activeUsers
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading downline data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Downline</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.totalDownline || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-green-600">{stats?.activeMembers || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Levels</p>
                <p className="text-2xl font-bold text-purple-600">{downlineByLevels.length}</p>
              </div>
              <TreePine className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total BV</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{downline.reduce((sum, u) => sum + parseFloat(u.totalBV || '0'), 0).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Downline Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {downlineByLevels.map(level => (
                  <SelectItem key={level.level} value={level.level.toString()}>
                    Level {level.level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Downline Levels */}
          <div className="space-y-4">
            {downlineByLevels.map((levelData) => {
              const isExpanded = expandedLevels.has(levelData.level);
              const levelStats = getLevelStats(levelData.level);
              
              return (
                <Card key={levelData.level} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLevel(levelData.level)}
                          className="p-1 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <CardTitle className="text-lg">
                            Level {levelData.level}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{levelStats.totalUsers} members</span>
                            <span>{levelStats.activeUsers} active</span>
                            <span>₹{levelStats.totalBV} BV</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {levelData.users.filter(u => u.position === 'left').length} Left
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {levelData.users.filter(u => u.position === 'right').length} Right
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {levelData.users.map((user) => (
                          <Card key={user.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">
                                      {user.firstName} {user.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                    {user.userId && (
                                      <p className="text-xs text-gray-400 font-mono">{user.userId}</p>
                                    )}
                                  </div>
                                </div>
                                <Badge 
                                  variant={user.idStatus === 'Active' ? 'default' : 'secondary'}
                                  className={`text-xs ${user.idStatus === 'Active' ? 'bg-green-600' : ''}`}
                                >
                                  {user.idStatus || 'Inactive'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Position:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {user.position || 'Left'}
                                  </Badge>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Package:</span>
                                  <span className="font-medium text-green-600">
                                    ₹{user.packageAmount || '0.00'}
                                  </span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total BV:</span>
                                  <span className="font-medium text-blue-600">
                                    ₹{user.totalBV || '0.00'}
                                  </span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Joined:</span>
                                  <span className="text-gray-500">
                                    {user.registrationDate 
                                      ? new Date(user.registrationDate).toLocaleDateString()
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {downlineByLevels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">No downline members yet</p>
              <p className="text-sm">Start building your team by recruiting new members!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
