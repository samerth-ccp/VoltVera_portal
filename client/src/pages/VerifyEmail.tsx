import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function VerifyEmail() {
  const [location] = useLocation();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // Extract token from URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const token = urlParams.get('token');

  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("POST", "/api/auth/verify-email", { token });
      return response;
    },
    onSuccess: (data: any) => {
      setMessage(data.message);
      setError("");
      setStatus('success');
    },
    onError: (error: any) => {
      setError(error.message || "Email verification failed");
      setMessage("");
      setStatus('error');
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token);
    } else {
      setError("No verification token provided");
      setStatus('error');
    }
  }, [token]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Clock className="h-16 w-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return "Verifying your email address...";
      case 'success':
        return "Email Verified Successfully!";
      case 'error':
        return "Email Verification Failed";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <VoltverashopLogo className="h-16 w-16" />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Email Verification
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {getStatusMessage()}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>

          {message && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {message}
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            {status === 'success' && (
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                  Sign In to Your Account
                </Button>
              </Link>
            )}
            
            {status === 'error' && (
              <div className="space-y-3">
                <Link href="/signup">
                  <Button variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50">
                    Create New Account
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-800">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}