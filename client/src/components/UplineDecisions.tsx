import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User, Mail, Phone, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, BarChart3, Users, DollarSign, Target, AlertTriangle } from "lucide-react";

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
  recruiterInfo?: {
    id: string;
    name: string;
    email: string;
    position: string;
    level: string;
    packageAmount: string;
    activationDate: string;
  };
  legBalance?: {
    leftLeg: { count: number; volume: number };
    rightLeg: { count: number; volume: number };
    weakerLeg: 'left' | 'right';
    strongerLeg: 'left' | 'right';
    balanceRatio: number;
  };
  availablePositions?: {
    left: boolean;
    right: boolean;
  };
  strategicRecommendation?: {
    recommendedPosition: 'left' | 'right';
    reason: string;
    impactAnalysis: {
      leftChoice: string;
      rightChoice: string;
    };
  };
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
        <div className="space-y-6">
          {pendingRecruits.map((recruit: PendingRecruit) => (
            <div key={recruit.id} className="border rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 overflow-hidden">
              {/* Header Section */}
              <div className="p-4 border-b bg-white/50">
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
                      Recruited by {recruit.recruiterInfo?.name} • {new Date(recruit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-2">Package Amount</div>
                    <div className="text-lg font-semibold text-green-600">${recruit.packageAmount}</div>
                  </div>
                </div>
              </div>

              {/* Strategic Information Panel */}
              {recruit.legBalance && recruit.strategicRecommendation && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Strategic Placement Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current Leg Balance */}
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">Your Network Balance</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-sm font-medium text-blue-600">LEFT LEG</div>
                          <div className="text-lg font-bold">{recruit.legBalance.leftLeg.count}</div>
                          <div className="text-xs text-gray-500">${recruit.legBalance.leftLeg.volume.toFixed(0)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-600">RIGHT LEG</div>
                          <div className="text-lg font-bold">{recruit.legBalance.rightLeg.count}</div>
                          <div className="text-xs text-gray-500">${recruit.legBalance.rightLeg.volume.toFixed(0)}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <div className="text-xs text-gray-500">Balance Ratio: {(recruit.legBalance.balanceRatio * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    {/* Recruiter Information */}
                    {recruit.recruiterInfo && (
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">Recruiter Details</div>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{recruit.recruiterInfo.name}</div>
                          <div className="text-xs text-gray-600">Level {recruit.recruiterInfo.level} • {recruit.recruiterInfo.position} position</div>
                          <div className="text-xs text-green-600 font-medium">${recruit.recruiterInfo.packageAmount} package</div>
                          <div className="text-xs text-gray-500">
                            Active since {new Date(recruit.recruiterInfo.activationDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Strategic Recommendation */}
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        AI Recommendation
                      </div>
                      <div className="space-y-2">
                        {recruit.strategicRecommendation.recommendedPosition ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={recruit.strategicRecommendation.recommendedPosition === 'left' ? 'default' : 'secondary'}
                                className={recruit.strategicRecommendation.recommendedPosition === 'left' ? 'bg-blue-600' : 'bg-green-600'}
                              >
                                {recruit.strategicRecommendation.recommendedPosition.toUpperCase()} LEG
                              </Badge>
                              {recruit.legBalance.weakerLeg === recruit.strategicRecommendation.recommendedPosition ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-orange-500" />
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              NO POSITIONS
                            </Badge>
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          </div>
                        )}
                        <div className="text-xs text-gray-600">
                          {recruit.strategicRecommendation.reason}
                        </div>
                        <div className="text-xs space-y-1">
                          <div>• {recruit.strategicRecommendation.impactAnalysis.leftChoice}</div>
                          <div>• {recruit.strategicRecommendation.impactAnalysis.rightChoice}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Position Selection */}
              <div className="p-4">
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-3 text-center">Choose Position in Your Network</h4>
                  
                  {/* Strategic Placement Information */}
                  {recruit.availablePositions && (!recruit.availablePositions.left || !recruit.availablePositions.right) && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700 text-sm">
                        <Target className="h-4 w-4" />
                        Strategic Placement Authority
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {!recruit.availablePositions.left && "LEFT position occupied - will spillover to next available slot. "}
                        {!recruit.availablePositions.right && "RIGHT position occupied - will spillover to next available slot. "}
                        <strong>As upline, you have full authority to choose strategic placement direction.</strong>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className={`h-24 flex flex-col items-center gap-2 relative ${
                            recruit.strategicRecommendation?.recommendedPosition === 'left'
                              ? 'border-2 border-blue-500 bg-blue-50 hover:bg-blue-100'
                              : recruit.availablePositions?.left === false 
                                ? 'border-2 border-orange-300 bg-orange-50 hover:bg-orange-100' 
                                : 'hover:bg-blue-50 hover:border-blue-300'
                          }`}
                          disabled={processingId === recruit.id}
                          onClick={() => setSelectedPosition('left')}
                        >
                          {recruit.strategicRecommendation?.recommendedPosition === 'left' && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                              <Target className="h-3 w-3" />
                            </div>
                          )}
                          <ArrowLeft className="h-6 w-6 text-blue-600" />
                          <span className="font-medium">LEFT Position</span>
                          <span className="text-xs text-center">
                            {recruit.legBalance && `${recruit.legBalance.leftLeg.count} members`}
                            {recruit.availablePositions?.left === false && " (Will Spillover)"}
                          </span>
                          {recruit.strategicRecommendation?.recommendedPosition === 'left' && (
                            <Badge variant="default" className="bg-green-500 text-[10px] px-1 py-0">
                              RECOMMENDED
                            </Badge>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve for LEFT Position</AlertDialogTitle>
                          <AlertDialogDescription>
                            You are approving <strong>{recruit.fullName}</strong> to be placed in the <strong>LEFT direction</strong> of your network tree.
                            <br /><br />
                            <strong>Strategic Impact:</strong><br />
                            • {recruit.strategicRecommendation?.impactAnalysis.leftChoice}<br />
                            • This will {recruit.legBalance?.weakerLeg === 'left' ? 'strengthen your weaker leg' : 'grow your stronger leg'}<br />
                            • Current balance ratio: {recruit.legBalance && (recruit.legBalance.balanceRatio * 100).toFixed(0)}%
                            <br /><br />
                            {recruit.availablePositions?.left === false ? 
                              "Note: Direct LEFT position is occupied. The system will automatically find the next available slot in the LEFT leg for optimal spillover placement." : 
                              "The recruit will be placed directly in your LEFT position."
                            }
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
                          className={`h-24 flex flex-col items-center gap-2 relative ${
                            recruit.strategicRecommendation?.recommendedPosition === 'right'
                              ? 'border-2 border-green-500 bg-green-50 hover:bg-green-100'
                              : recruit.availablePositions?.right === false 
                                ? 'border-2 border-orange-300 bg-orange-50 hover:bg-orange-100' 
                                : 'hover:bg-green-50 hover:border-green-300'
                          }`}
                          disabled={processingId === recruit.id}
                          onClick={() => setSelectedPosition('right')}
                        >
                          {recruit.strategicRecommendation?.recommendedPosition === 'right' && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                              <Target className="h-3 w-3" />
                            </div>
                          )}
                          <ArrowRight className="h-6 w-6 text-green-600" />
                          <span className="font-medium">RIGHT Position</span>
                          <span className="text-xs text-center">
                            {recruit.legBalance && `${recruit.legBalance.rightLeg.count} members`}
                            {recruit.availablePositions?.right === false && " (Will Spillover)"}
                          </span>
                          {recruit.strategicRecommendation?.recommendedPosition === 'right' && (
                            <Badge variant="default" className="bg-green-500 text-[10px] px-1 py-0">
                              RECOMMENDED
                            </Badge>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve for RIGHT Position</AlertDialogTitle>
                          <AlertDialogDescription>
                            You are approving <strong>{recruit.fullName}</strong> to be placed in the <strong>RIGHT direction</strong> of your network tree.
                            <br /><br />
                            <strong>Strategic Impact:</strong><br />
                            • {recruit.strategicRecommendation?.impactAnalysis.rightChoice}<br />
                            • This will {recruit.legBalance?.weakerLeg === 'right' ? 'strengthen your weaker leg' : 'grow your stronger leg'}<br />
                            • Current balance ratio: {recruit.legBalance && (recruit.legBalance.balanceRatio * 100).toFixed(0)}%
                            <br /><br />
                            {recruit.availablePositions?.right === false ? 
                              "Note: Direct RIGHT position is occupied. The system will automatically find the next available slot in the RIGHT leg for optimal spillover placement." : 
                              "The recruit will be placed directly in your RIGHT position."
                            }
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}