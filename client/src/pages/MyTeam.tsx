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
        <Tabs defaultValue="direct" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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

          {/* Direct Recruits Tab */}
          <TabsContent value="direct" className="space-y-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                      <Card key={member.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </div>
                              <div>
                                <h3 className="font-semibold">{member.firstName} {member.lastName}</h3>
                                <p className="text-sm text-gray-600">{member.email}</p>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(member.status)} text-white`}>
                              {getStatusLabel(member.status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined: {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
            <Card>
              <CardHeader>
                <CardTitle>Team Hierarchy Tree</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Tree visualization coming soon...
                </div>
              </CardContent>
            </Card>
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