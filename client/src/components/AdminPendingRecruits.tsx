import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { RejectRecruitDialog } from "./RejectRecruitDialog";

interface PendingRecruit {
  id: string;
  email: string;
  fullName: string;
  mobile?: string;
  recruiterId: string;
  packageAmount: string;
  position: string;
  status: string;
  uplineDecision: string;
  uplineDecisionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function AdminPendingRecruits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecruit, setSelectedRecruit] = useState<PendingRecruit | null>(null);
  const [packageAmount, setPackageAmount] = useState("0.00");
  const [position, setPosition] = useState("Left");
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [rejectDialogRecruit, setRejectDialogRecruit] = useState<PendingRecruit | null>(null);

  // Fetch pending recruits
  const { data: pendingRecruits = [], isLoading } = useQuery<PendingRecruit[]>({
    queryKey: ["/api/admin/pending-recruits"],
  });

  // Approve recruit mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, packageAmount, position }: { id: string; packageAmount: string; position?: string }) => {
      const payload: any = { packageAmount };
      // Only include position if it's not already decided by upline
      if (position && selectedRecruit?.uplineDecision !== 'approved') {
        payload.position = position;
      }
      const response = await apiRequest('POST', `/api/admin/pending-recruits/${id}/approve`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-recruits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsApproveOpen(false);
      setSelectedRecruit(null);
      toast({
        title: "Recruit approved",
        description: "User account created successfully and credentials will be sent",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve recruit",
        variant: "destructive",
      });
    },
  });

  // Note: Reject functionality is now handled by RejectRecruitDialog

  const handleApprove = (recruit: PendingRecruit) => {
    setSelectedRecruit(recruit);
    setPackageAmount("0.00");
    // Set position to existing position if already decided by upline
    setPosition(recruit.uplineDecision === 'approved' ? recruit.position : "Left");
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = () => {
    if (!selectedRecruit) return;
    approveMutation.mutate({
      id: selectedRecruit.id,
      packageAmount,
      position
    });
  };

  const handleReject = (recruit: PendingRecruit) => {
    setRejectDialogRecruit(recruit);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Recruits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading pending recruits...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Pending Recruits ({pendingRecruits.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRecruits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending recruits to process
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRecruits.map((recruit) => (
              <div key={recruit.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {recruit.fullName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{recruit.email}</p>
                      {recruit.mobile && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">{recruit.mobile}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
                      {recruit.status}
                    </Badge>
                    {recruit.uplineDecision === 'approved' && (
                      <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                        {recruit.position} Position (Upline Decided)
                      </Badge>
                    )}
                    <span>
                      Submitted {formatDistanceToNow(new Date(recruit.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(recruit)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(recruit)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Recruit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedRecruit && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-semibold">{selectedRecruit.fullName}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRecruit.email}</p>
                  {selectedRecruit.uplineDecision === 'approved' && (
                    <div className="mt-2">
                      <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                        Position: {selectedRecruit.position} (Strategically chosen by upline)
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="packageAmount">Package Amount ($)</Label>
                <Input
                  id="packageAmount"
                  type="text"
                  value={packageAmount}
                  onChange={(e) => setPackageAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              {/* Only show position selector if upline hasn't decided */}
              {selectedRecruit?.uplineDecision !== 'approved' && (
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Left">Left</SelectItem>
                      <SelectItem value="Right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleApproveSubmit}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  {approveMutation.isPending ? "Processing..." : "Approve & Create User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <RejectRecruitDialog
          isOpen={rejectDialogRecruit !== null}
          onClose={() => setRejectDialogRecruit(null)}
          recruitId={rejectDialogRecruit?.id || ""}
          recruitName={rejectDialogRecruit?.fullName || ""}
        />
      </CardContent>
    </Card>
  );
}