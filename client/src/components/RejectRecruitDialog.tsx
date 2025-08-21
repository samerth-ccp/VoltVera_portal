import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RejectRecruitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recruitId: string;
  recruitName: string;
}

export function RejectRecruitDialog({ 
  isOpen, 
  onClose, 
  recruitId, 
  recruitName 
}: RejectRecruitDialogProps) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rejectRecruit = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/pending-recruits/${recruitId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "No reason provided" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject recruit");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recruit Rejected",
        description: `${recruitName} has been rejected with notifications sent to all parties.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-recruits"] });
      setReason("");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject recruit",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason with at least 5 characters.",
        variant: "destructive",
      });
      return;
    }
    rejectRecruit.mutate();
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Recruit</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You are about to reject <strong>{recruitName}</strong>. 
              Please provide a reason for the rejection.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rejection</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this recruit is being rejected..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              This reason will be sent to the recruiter and upline in their notifications.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={rejectRecruit.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={rejectRecruit.isPending || reason.trim().length < 5}
            >
              {rejectRecruit.isPending ? "Rejecting..." : "Reject Recruit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}