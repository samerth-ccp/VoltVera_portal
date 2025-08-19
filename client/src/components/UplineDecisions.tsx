import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User, Mail, Phone, ArrowLeft, ArrowRight } from "lucide-react";

interface PendingRecruit {
  id: string;
  email: string;
  fullName: string;
  mobile?: string;
  recruiterId: string;
  uplineId?: string;
  packageAmount: string;
  position?: string;
  uplineDecision: string;
  uplineDecisionAt?: string;
  status: string;
  createdAt: string;
}

export function UplineDecisions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPosition, setSelectedPosition] = useState<'left' | 'right' | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: pendingRecruits = [], isLoading } = useQuery<PendingRecruit[]>({
    queryKey: ['/api/upline/pending-recruits'],
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, decision, position }: { id: string; decision: 'approved' | 'rejected'; position?: 'left' | 'right' }) => {
      const response = await fetch(`/api/upline/pending-recruits/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, position }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process decision');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/upline/pending-recruits'] });
      toast({
        title: "Decision Processed",
        description: data.message,
      });
      setProcessingId(null);
      setSelectedPosition(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setProcessingId(null);
      setSelectedPosition(null);
    },
  });

  const handleApprove = (recruitId: string, position: 'left' | 'right') => {
    setProcessingId(recruitId);
    decideMutation.mutate({ id: recruitId, decision: 'approved', position });
  };

  const handleReject = (recruitId: string) => {
    setProcessingId(recruitId);
    decideMutation.mutate({ id: recruitId, decision: 'rejected' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Position Decisions Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRecruits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Position Decisions Needed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pending position decisions at the moment.</p>
            <p className="text-sm mt-2">When your team members recruit someone, you'll decide their position here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Position Decisions Needed ({pendingRecruits.length})
        </CardTitle>
        <p className="text-sm text-gray-600">
          Your team members have recruited new people. Choose their LEFT or RIGHT position in your network.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingRecruits.map((recruit: PendingRecruit) => (
            <div key={recruit.id} className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="font-semibold text-lg">{recruit.fullName}</span>
                    <Badge variant="secondary">Awaiting Your Decision</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {recruit.email}
                    </div>
                    {recruit.mobile && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {recruit.mobile}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Recruited by your team member • {new Date(recruit.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-2">Package Amount</div>
                  <div className="text-lg font-semibold text-green-600">${recruit.packageAmount}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-3 text-center">Choose Position in Your Network</h4>
                <div className="grid grid-cols-2 gap-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                        disabled={processingId === recruit.id}
                        onClick={() => setSelectedPosition('left')}
                      >
                        <ArrowLeft className="h-6 w-6 text-blue-600" />
                        <span className="font-medium">LEFT Position</span>
                        <span className="text-xs text-gray-500">Place on left side</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve for LEFT Position</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are approving <strong>{recruit.fullName}</strong> to be placed in the <strong>LEFT position</strong> of your network tree. 
                          This decision will move the recruit to admin approval stage.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleApprove(recruit.id, 'left')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Approve LEFT Position
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-20 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300"
                        disabled={processingId === recruit.id}
                        onClick={() => setSelectedPosition('right')}
                      >
                        <ArrowRight className="h-6 w-6 text-green-600" />
                        <span className="font-medium">RIGHT Position</span>
                        <span className="text-xs text-gray-500">Place on right side</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve for RIGHT Position</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are approving <strong>{recruit.fullName}</strong> to be placed in the <strong>RIGHT position</strong> of your network tree. 
                          This decision will move the recruit to admin approval stage.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleApprove(recruit.id, 'right')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve RIGHT Position
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Decision needed by upline • Time remaining: 24h
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={processingId === recruit.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Recruit</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reject <strong>{recruit.fullName}</strong>? 
                        This action cannot be undone and the recruit will be removed from the system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleReject(recruit.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reject Recruit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {processingId === recruit.id && (
                <div className="mt-3 flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Processing decision...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}