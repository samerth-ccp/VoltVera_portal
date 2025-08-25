import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AdminDashboard from "@/pages/AdminDashboard";
import UserDashboard from "@/pages/UserDashboard";
import ChangePassword from "@/pages/ChangePassword";
import ForgotPassword from "@/pages/ForgotPassword";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import KYCUpload from "@/pages/KYCUpload";
import ResetPassword from "@/pages/ResetPassword";
import CompleteInvitation from "@/pages/CompleteInvitation";
import MyTeam from "@/pages/MyTeam";
import ProductCatalog from "@/pages/ProductCatalog";
import MyPurchases from "@/pages/MyPurchases";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/complete-invitation" component={CompleteInvitation} />
      
      {/* Show landing page if not authenticated or still loading */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Protected routes for authenticated users */}
          <Route path="/change-password" component={ChangePassword} />
          <Route path="/dashboard" component={UserDashboard} />
          <Route path="/kyc-upload" component={KYCUpload} />
          <Route path="/my-team" component={MyTeam} />
          <Route path="/products" component={ProductCatalog} />
          <Route path="/my-purchases" component={MyPurchases} />
          
          {/* Role-based routing for authenticated users */}
          {user?.role === 'admin' ? (
            <Route path="/" component={AdminDashboard} />
          ) : (
            <Route path="/" component={UserDashboard} />
          )}
        </>
      )}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
