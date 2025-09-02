import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Award, 
  Star, 
  Users, 
  DollarSign,
  BarChart3,
  Zap,
  Crown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TeamBusinessMetrics {
  currentRank: string;
  nextRank: string;
  teamBV: string;
  leftBV: string;
  rightBV: string;
  totalDirects: number;
  totalDownline: number;
  rankProgress: number;
  nextRankRequirements: {
    teamBV: string;
    leftBV: string;
    rightBV: string;
    directRecruits: number;
  };
}

export function TeamBusinessStages() {
  const { user } = useAuth();

  // Fetch team business metrics
  const { data: metrics, isLoading } = useQuery<TeamBusinessMetrics>({
    queryKey: ["/api/team/business-metrics"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/team/stats');
      const data = await response.json();
      
      // Calculate rank progression based on current data
      const currentRank = data.currentRank || 'Executive';
      const teamBV = parseFloat(data.teamBV || '0');
      const leftBV = parseFloat(data.leftBV || '0');
      const rightBV = parseFloat(data.rightBV || '0');
      
      // Define rank requirements (you can adjust these based on your MLM plan)
      const rankRequirements = {
        'Executive': { teamBV: 0, leftBV: 0, rightBV: 0, directRecruits: 0 },
        'Bronze Star': { teamBV: 10000, leftBV: 5000, rightBV: 5000, directRecruits: 2 },
        'Gold Star': { teamBV: 25000, leftBV: 12500, rightBV: 12500, directRecruits: 4 },
        'Emerald Star': { teamBV: 50000, leftBV: 25000, rightBV: 25000, directRecruits: 6 },
        'Ruby Star': { teamBV: 100000, leftBV: 50000, rightBV: 50000, directRecruits: 8 },
        'Diamond': { teamBV: 250000, leftBV: 125000, rightBV: 125000, directRecruits: 10 },
        'Wise President': { teamBV: 500000, leftBV: 250000, rightBV: 250000, directRecruits: 12 },
        'President': { teamBV: 1000000, leftBV: 500000, rightBV: 500000, directRecruits: 15 },
        'Ambassador': { teamBV: 2500000, leftBV: 1250000, rightBV: 1250000, directRecruits: 20 },
        'Deputy Director': { teamBV: 5000000, leftBV: 2500000, rightBV: 2500000, directRecruits: 25 },
        'Director': { teamBV: 10000000, leftBV: 5000000, rightBV: 5000000, directRecruits: 30 },
        'Founder': { teamBV: 25000000, leftBV: 12500000, rightBV: 12500000, directRecruits: 40 }
      };
      
      const ranks = Object.keys(rankRequirements);
      const currentRankIndex = ranks.indexOf(currentRank);
      const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : currentRank;
      
      const nextRankReq = rankRequirements[nextRank as keyof typeof rankRequirements];
      
      // Calculate progress percentage
      const bvProgress = Math.min((teamBV / parseFloat(nextRankReq.teamBV)) * 100, 100);
      const leftProgress = Math.min((leftBV / parseFloat(nextRankReq.leftBV)) * 100, 100);
      const rightProgress = Math.min((rightBV / parseFloat(nextRankReq.rightBV)) * 100, 100);
      const recruitsProgress = Math.min((data.totalDirects / nextRankReq.directRecruits) * 100, 100);
      
      const overallProgress = (bvProgress + leftProgress + rightProgress + recruitsProgress) / 4;
      
      return {
        currentRank,
        nextRank,
        teamBV: data.teamBV || '0.00',
        leftBV: data.leftBV || '0.00',
        rightBV: data.rightBV || '0.00',
        totalDirects: data.totalDirects || 0,
        totalDownline: data.totalDownline || 0,
        rankProgress: overallProgress,
        nextRankRequirements: nextRankReq
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading business metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No business metrics available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: string) => {
    const rankIcons: Record<string, any> = {
      'Executive': <Star className="h-5 w-5 text-yellow-500" />,
      'Bronze Star': <Star className="h-5 w-5 text-orange-500" />,
      'Gold Star': <Star className="h-5 w-5 text-yellow-400" />,
      'Emerald Star': <Star className="h-5 w-5 text-emerald-500" />,
      'Ruby Star': <Star className="h-5 w-5 text-red-500" />,
      'Diamond': <Trophy className="h-5 w-5 text-blue-500" />,
      'Wise President': <Crown className="h-5 w-5 text-purple-500" />,
      'President': <Crown className="h-5 w-5 text-purple-600" />,
      'Ambassador': <Award className="h-5 w-5 text-indigo-500" />,
      'Deputy Director': <Zap className="h-5 w-5 text-amber-500" />,
      'Director': <Zap className="h-5 w-5 text-amber-600" />,
      'Founder': <Crown className="h-5 w-5 text-yellow-600" />
    };
    return rankIcons[rank] || <Star className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Current Rank and Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getRankIcon(metrics.currentRank)}
              Current Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-600 mb-2">{metrics.currentRank}</h3>
              <Progress value={metrics.rankProgress} className="h-2" />
              <p className="text-sm text-gray-600 mt-2">
                {metrics.rankProgress.toFixed(1)}% to next rank
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-green-500" />
              Next Rank Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-600 mb-2">{metrics.nextRank}</h3>
              <p className="text-sm text-gray-600">
                {metrics.nextRank === metrics.currentRank ? 'Maximum rank achieved!' : 'Keep growing to reach this rank'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Team Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-purple-600 mb-2">{metrics.totalDownline}</h3>
              <p className="text-sm text-gray-600">
                Total team members
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Volume Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Business Volume (BV) Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Team BV</span>
                <span className="text-lg font-bold text-blue-600">₹{metrics.teamBV}</span>
              </div>
              <Progress 
                value={Math.min((parseFloat(metrics.teamBV) / parseFloat(metrics.nextRankRequirements.teamBV)) * 100, 100)} 
                className="h-2" 
              />
              <p className="text-xs text-gray-500">
                Target: ₹{metrics.nextRankRequirements.teamBV}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Left Leg BV</span>
                <span className="text-lg font-bold text-green-600">₹{metrics.leftBV}</span>
              </div>
              <Progress 
                value={Math.min((parseFloat(metrics.leftBV) / parseFloat(metrics.nextRankRequirements.leftBV)) * 100, 100)} 
                className="h-2" 
              />
              <p className="text-xs text-gray-500">
                Target: ₹{metrics.nextRankRequirements.leftBV}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Right Leg BV</span>
                <span className="text-lg font-bold text-teal-600">₹{metrics.rightBV}</span>
              </div>
              <Progress 
                value={Math.min((parseFloat(metrics.rightBV) / parseFloat(metrics.nextRankRequirements.rightBV)) * 100, 100)} 
                className="h-2" 
              />
              <p className="text-xs text-gray-500">
                Target: ₹{metrics.nextRankRequirements.rightBV}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Rank Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Requirements for {metrics.nextRank}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-blue-900">Team BV</h4>
              <p className="text-2xl font-bold text-blue-600">₹{metrics.nextRankRequirements.teamBV}</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-green-900">Left Leg BV</h4>
              <p className="text-2xl font-bold text-green-600">₹{metrics.nextRankRequirements.leftBV}</p>
            </div>

            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-teal-600" />
              </div>
              <h4 className="font-semibold text-teal-900">Right Leg BV</h4>
              <p className="text-2xl font-bold text-teal-600">₹{metrics.nextRankRequirements.rightBV}</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-purple-900">Direct Recruits</h4>
              <p className="text-2xl font-bold text-purple-600">{metrics.nextRankRequirements.directRecruits}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rank Progression Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Rank Progression Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <span className="font-medium">Executive</span>
              </div>
              <Badge variant="outline">Starting Rank</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <span className="font-medium">Bronze Star → Gold Star → Emerald Star</span>
              </div>
              <Badge variant="outline">Growth Phase</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <span className="font-medium">Ruby Star → Diamond</span>
              </div>
              <Badge variant="outline">Leadership Phase</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  4
                </div>
                <span className="font-medium">Wise President → President → Ambassador</span>
              </div>
              <Badge variant="outline">Executive Phase</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  5
                </div>
                <span className="font-medium">Deputy Director → Director → Founder</span>
              </div>
              <Badge variant="outline">Elite Phase</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
