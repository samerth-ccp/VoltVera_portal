import { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [location, setLocation] = useLocation();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Extract token from URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const token = urlParams.get('token');

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data: any) => {
      setMessage(data.message);
      setError("");
      form.reset();
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: any) => {
      setError(error.message || "Password reset failed");
      setMessage("");
    },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    if (!token) {
      setError("No reset token provided");
      return;
    }
    resetMutation.mutate({ token, newPassword: data.newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <VoltverashopLogo className="h-16 w-16" />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                This password reset link is invalid or has expired
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="text-center space-y-4">
              <Link href="/forgot-password">
                <Button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/" className="block text-sm text-green-600 hover:text-green-700">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <VoltverashopLogo className="h-16 w-16" />
          </div>
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Reset Password
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Enter your new password below
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {message && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {message}
                <br />
                <span className="text-sm">Redirecting to login page...</span>
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field}
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-200">Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field}
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Link href="/" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}