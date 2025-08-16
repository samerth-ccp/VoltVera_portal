import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import VoltverashopLogo from "@/components/VoltverashopLogo";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [resetResult, setResetResult] = useState<any>(null);
  const { toast } = useToast();

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      return response.json();
    },
    onSuccess: (data) => {
      setResetResult(data);
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process password reset",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen volt-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <VoltverashopLogo size="large" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <p className="text-gray-600 text-sm">
            Enter your email address and we'll help you reset your password.
          </p>
        </CardHeader>
        <CardContent>
          {!resetResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full volt-gradient text-white"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Instructions"}
              </Button>

              <div className="text-center">
                <Link href="/">
                  <Button variant="ghost" className="text-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">{resetResult.message}</p>
                {resetResult.password && (
                  <div className="mt-3 p-3 bg-white border rounded">
                    <p className="text-xs text-gray-600 mb-1">Development Mode - Your Password:</p>
                    <p className="font-mono text-sm font-semibold">{resetResult.password}</p>
                  </div>
                )}
              </div>
              
              <Link href="/">
                <Button className="w-full volt-gradient text-white">
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}