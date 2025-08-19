import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCheck } from "lucide-react";

interface TeamStatsProps {
  stats?: {
    directRecruits: number;
    totalDownline: number;
    activeMembers: number;
  };
}

export default function TeamStats({ stats }: TeamStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Direct Recruits</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.directRecruits || 0}</div>
          <p className="text-xs text-muted-foreground">
            Users you directly recruited
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Downline</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalDownline || 0}</div>
          <p className="text-xs text-muted-foreground">
            Total network size (all levels)
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          <UserCheck className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeMembers || 0}</div>
          <p className="text-xs text-muted-foreground">
            Currently active in downline
          </p>
        </CardContent>
      </Card>
    </div>
  );
}