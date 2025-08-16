import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import VoltverashopLogo from "@/components/VoltverashopLogo";
import { Link } from "wouter";

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/login', credentials);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      // Refresh to trigger routing
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleReplitLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center volt-gradient p-4 relative overflow-hidden">
      {/* White accent elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/8 rounded-full blur-2xl"></div>
      <Card className="flex flex-col lg:flex-row bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden max-w-6xl w-full border-0 relative z-10">
        {/* Login Form Section */}
        <div className="volt-gradient p-8 sm:p-12 lg:p-16 flex-1 flex flex-col justify-center min-h-[600px] lg:min-h-[700px]">
          <div className="text-white text-2xl sm:text-3xl font-light mb-3">
            Welcome to <span className="font-semibold">Voltverashop</span>
          </div>
          <div className="text-white/90 text-sm mb-6">Enter your email and password to continue.</div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="block text-white font-medium mb-2 text-sm">Email</Label>
              <Input 
                type="email" 
                className="w-full p-5 border-none rounded-lg text-base bg-white/95 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                placeholder="admin@voltverashop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label className="block text-white font-medium mb-2 text-sm">Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  className="w-full p-5 border-none rounded-lg text-base bg-white/95 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                  placeholder="admin123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <label className="flex items-center text-white text-sm cursor-pointer">
                <input type="checkbox" className="mr-2 accent-white" defaultChecked /> 
                Remember me
              </label>
              <Link href="/forgot-password">
                <button className="text-white/90 text-sm hover:text-white transition-colors">
                  Forgot password?
                </button>
              </Link>
            </div>
            
            <Button 
              type="submit" 
              className="w-full p-5 bg-white text-volt-dark rounded-lg text-lg font-semibold hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 mb-6"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Log in"}
            </Button>
            

          </form>
        </div>
        
        {/* Branding Section */}
        <div className="volt-gradient-light flex-1 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 text-center min-h-[600px] lg:min-h-[700px]">
          <VoltverashopLogo size="hero" />
        </div>
      </Card>
    </div>
  );
}
