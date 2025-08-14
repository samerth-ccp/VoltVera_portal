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

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Demo login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/demo-login', credentials);
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
    <div className="min-h-screen flex items-center justify-center volt-gradient">
      <Card className="flex bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-4 border-0">
        {/* Login Form Section */}
        <div className="volt-gradient p-12 flex-1 flex flex-col justify-center">
          <div className="text-white text-3xl font-light mb-3">
            Welcome to <span className="font-semibold">Voltverashop</span>
          </div>
          <div className="text-white/90 text-sm mb-4">Enter your email and password to continue.</div>
          <div className="bg-white/10 rounded-lg p-3 mb-6">
            <div className="text-white/80 text-xs font-medium mb-1">Demo Admin Credentials:</div>
            <div className="text-white text-sm">Email: admin@voltverashop.com</div>
            <div className="text-white text-sm">Password: admin123</div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="block text-white font-medium mb-2 text-sm">Email</Label>
              <Input 
                type="email" 
                className="w-full p-4 border-none rounded-lg text-sm bg-white/95 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
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
                  className="w-full p-4 border-none rounded-lg text-sm bg-white/95 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
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
              <a href="#" className="text-white/90 text-sm hover:text-white transition-colors">
                Forgot password?
              </a>
            </div>
            
            <Button 
              type="submit" 
              className="w-full p-4 bg-white text-volt-dark rounded-lg text-base font-semibold hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 mb-6"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Log in"}
            </Button>
            
            <div className="text-center text-white/80 text-sm mb-5">Or sign in with</div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="secondary"
                className="flex-1 p-3 bg-white text-gray-700 rounded-lg font-medium hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                onClick={handleReplitLogin}
              >
                Replit
              </Button>
              <Button 
                type="button" 
                className="flex-1 p-3 bg-blue-600 text-white rounded-lg font-medium hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                disabled
              >
                f
              </Button>
              <Button 
                type="button" 
                className="flex-1 p-3 bg-black text-white rounded-lg font-medium hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                disabled
              >
                🍎
              </Button>
            </div>
          </form>
        </div>
        
        {/* Branding Section */}
        <div className="volt-gradient-light flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-8">
            <VoltverashopLogo />
          </div>
          
          <div className="text-4xl font-bold text-gray-800 mb-3">Voltverashop</div>
          <div className="text-sm font-semibold text-gray-600 tracking-wide mb-1">ENABLE SUSTAINABILITY WITH</div>
          <div className="text-sm font-semibold text-gray-600 tracking-wide">EVERY VOLT</div>
        </div>
      </Card>
    </div>
  );
}
