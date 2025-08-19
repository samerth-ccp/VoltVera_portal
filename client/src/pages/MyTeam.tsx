import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, TreePine, BarChart3, UserCheck, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { User, RecruitUser } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import BinaryTreeView from "@/components/BinaryTreeView";
import { UplineDecisions } from "@/components/UplineDecisions";

const recruitFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
});

type RecruitFormData = z.infer<typeof recruitFormSchema>;

export default function MyTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isRecruitOpen, setIsRecruitOpen] = useState(false);

  // Form handling
  const form = useForm<RecruitFormData>({
    resolver: zodResolver(recruitFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  // Fetch direct team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<User[]>({
    queryKey: ["/api/team/members"],
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

  // Fetch pending recruits
  const { data: pendingRecruits = [] } = useQuery<any[]>({
    queryKey: ["/api/team/pending-recruits"],
    enabled: !!user,
  });

  // Recruit mutation
  const recruitMutation = useMutation({
    mutationFn: async (data: RecruitFormData) => {
      const response = await apiRequest('POST', '/api/team/recruit', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/stats"] });
      setIsRecruitOpen(false);
      form.reset();
      toast({
        title: "Recruit submitted",
        description: "Admin will process and send credentials to your recruit",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit recruit",
        variant: "destructive",
      });
    },
  });

  const handleRecruit = (data: RecruitFormData) => {
    recruitMutation.mutate(data);
  };

  const filteredMembers = teamMembers.filter(member =>
    member.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    member.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'Pending Admin';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Team</h1>
          <p className="text-gray-600">Manage your recruitment network</p>
        </div>
        
        <Dialog open={isRecruitOpen} onOpenChange={setIsRecruitOpen}>
          <DialogTrigger asChild>
            <Button className="volt-gradient text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Recruit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Recruit</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleRecruit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  {...form.register("fullName")}
                  placeholder="Enter recruit's full name"
                />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="Enter recruit's email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecruitOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recruitMutation.isPending}
                  className="volt-gradient text-white"
                >
                  {recruitMutation.isPending ? "Submitting..." : "Submit Recruit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        {/* Stats Cards */}
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
              <BarChart3 className="h-4 w-4 text-green-500" />
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="decisions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="decisions" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Position Decisions
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="downline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Downline
            </TabsTrigger>
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Binary Tree
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Team Business Stages
            </TabsTrigger>
          </TabsList>

          {/* Position Decisions Tab */}
          <TabsContent value="decisions" className="space-y-6">
            <UplineDecisions />
          </TabsContent>

          {/* Direct Recruits Tab */}
          <TabsContent value="direct" className="space-y-6">
            {/* Pending Recruits Section */}
            {pendingRecruits.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <UserCheck className="h-5 w-5" />
                    Pending Recruits ({pendingRecruits.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingRecruits.map((recruit) => (
                      <div key={recruit.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {recruit.fullName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{recruit.email}</p>
                            {recruit.mobile && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{recruit.mobile}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-300">
                            {recruit.status}
                          </Badge>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Submitted {recruit.createdAt ? formatDistanceToNow(new Date(recruit.createdAt), { addSuffix: true }) : 'recently'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Admin will process these recruits and send login credentials once approved.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Direct Recruits ({teamMembers.length})</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search recruits..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="text-center py-8">Loading team members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {search ? "No recruits found matching your search." : "No direct recruits yet. Start building your team!"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Name</th>
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Email</th>
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">Package Amount</th>
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">Registration Date</th>
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">Activation Date</th>
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">ID Status</th>
                          <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {member.firstName?.[0]}{member.lastName?.[0]}
                                </div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {member.firstName} {member.lastName}
                                </div>
                              </div>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {member.email}
                              </div>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                ${member.packageAmount || '0.00'}
                              </span>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">
                              <div className="text-sm">
                                {member.registrationDate 
                                  ? new Date(member.registrationDate).toLocaleDateString()
                                  : member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'
                                }
                              </div>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">
                              <div className="text-sm">
                                {member.activationDate 
                                  ? new Date(member.activationDate).toLocaleDateString()
                                  : '-'
                                }
                              </div>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">
                              <Badge 
                                variant={member.idStatus === 'Active' ? 'default' : 'secondary'}
                                className={`${member.idStatus === 'Active' ? 'bg-green-600' : ''}`}
                              >
                                {member.idStatus || 'Inactive'}
                              </Badge>
                            </td>
                            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center">
                              <span className="text-sm">
                                {member.position || 'Left'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Downline Tab */}
          <TabsContent value="downline">
            <Card>
              <CardHeader>
                <CardTitle>Team Downline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Downline view coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Binary Tree Tab */}
          <TabsContent value="tree">
            <BinaryTreeView />
          </TabsContent>

          {/* Team Business Stages Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Team Business Stages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Business stages tracking coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}