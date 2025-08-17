import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import VoltverashopLogo from "@/components/VoltverashopLogo";

export default function CompleteInvitation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      toast({
        title: "Invalid Link",
        description: "This invitation link is missing required information.",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [toast, setLocation]);

  const validateToken = async (tokenValue: string) => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/auth/validate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTokenValid(true);
        setUserInfo(data.user);
      } else {
        setTokenValid(false);
        toast({
          title: "Invalid Invitation",
          description: data.message || "This invitation link has expired or is invalid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTokenValid(false);
      toast({
        title: "Error",
        description: "Failed to validate invitation. Please try again.",
        variant: "destructive",
      });
    }
    setIsValidating(false);
  };

  const handleCompleteInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/complete-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account Setup Complete!",
          description: "Your account has been activated. You can now log in.",
        });
        setLocation('/');
      } else {
        toast({
          title: "Setup Failed",
          description: data.message || "Failed to complete account setup.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <VoltverashopLogo />
            <div className="flex items-center mt-6">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <p className="text-gray-600">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <VoltverashopLogo />
            <AlertCircle className="h-16 w-16 text-red-500 mt-6" />
            <h2 className="text-xl font-semibold text-gray-800 mt-4">Invalid Invitation</h2>
            <p className="text-gray-600 text-center mt-2">
              This invitation link has expired or is no longer valid.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="volt-gradient text-white mt-6"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <VoltverashopLogo />
          <CardTitle className="text-2xl font-bold text-gray-800 mt-4">
            Complete Account Setup
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Welcome {userInfo?.firstName}! Set your password to get started.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompleteInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                value={userInfo?.email || ''} 
                disabled 
                className="bg-gray-100"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full volt-gradient text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Setting Up Account...
                </div>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}