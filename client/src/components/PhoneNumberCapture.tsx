import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";

interface PhoneNumberCaptureProps {
  open: boolean;
  userId: string;
}

export default function PhoneNumberCapture({ open, userId }: PhoneNumberCaptureProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updatePhone = useMutation({
    mutationFn: async (mobile: string) => {
      const res = await apiRequest("PATCH", "/api/user/phone", { mobile });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Phone number saved", description: "Your phone number has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to save phone number");
    },
  });

  const handleSubmit = () => {
    setError("");
    const cleaned = phone.replace(/\s/g, "");
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    updatePhone.mutate(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            Phone Number Required
          </DialogTitle>
          <DialogDescription>
            Please provide your mobile number to continue. This is required for order updates and account security.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md border">+91</span>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(val);
                  setError("");
                }}
                maxLength={10}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={updatePhone.isPending || phone.length < 10}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {updatePhone.isPending ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
