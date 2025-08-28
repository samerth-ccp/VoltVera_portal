import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import VoltverashopLogo from "@/components/VoltverashopLogo";

export default function ReferralRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Extract token from URL - check both 'ref' and 'token' parameters
    const urlParams = new URLSearchParams(window.location.search);
    const referralToken = urlParams.get('ref') || urlParams.get('token');
    if (referralToken) {
      setToken(referralToken);
    } else {
      toast({
        title: "Invalid Link",
        description: "This referral link is invalid or expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation('/'), 2000);
    }
  }, [toast, setLocation]);

  const submitRegistrationMutation = useMutation({
    mutationFn: async (data: { token: string; recruiteeName: string; recruiteeEmail: string }) => {
      return apiRequest('POST', '/api/recruitment/register', data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Registration Submitted!",
        description: "Your recruitment request has been submitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to submit registration request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both your name and email address.",
        variant: "destructive",
      });
      return;
    }

    submitRegistrationMutation.mutate({
      token,
      recruiteeName: name.trim(),
      recruiteeEmail: email.trim(),
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Registration Submitted!</h2>
            <p className="text-white/70 mb-6">
              Your recruitment request has been submitted successfully. You'll receive an email 
              with your login credentials once approved by an administrator.
            </p>
            <Button
              onClick={() => setLocation('/')}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-sm border-white/10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <VoltverashopLogo className="h-12 w-auto" />
          </div>
          <CardTitle className="text-white flex items-center justify-center">
            <UserPlus className="mr-2 h-6 w-6 text-green-400" />
            Join Voltvera Network
          </CardTitle>
          <Badge variant="secondary" className="bg-green-400/20 text-green-300 border-green-400/30 mx-auto">
            Referral Registration
          </Badge>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
                required
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
                required
                data-testid="input-email"
              />
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-white/80">
                  <p className="font-medium text-blue-300 mb-1">What happens next:</p>
                  <ul className="space-y-1 text-white/70">
                    <li>• Your request will be reviewed by an administrator</li>
                    <li>• You'll receive login credentials via email upon approval</li>
                    <li>• Complete KYC verification within 7 days of approval</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitRegistrationMutation.isPending}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              data-testid="button-submit"
            >
              {submitRegistrationMutation.isPending ? 'Submitting...' : 'Submit Registration'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="link-home"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Back to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}