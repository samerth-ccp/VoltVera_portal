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
import FounderDashboard from "@/pages/FounderDashboard";
import FranchiseDashboard from "@/pages/FranchiseDashboard";
import CompleteReferralRegistration from "@/pages/CompleteReferralRegistration";
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
import PendingUserDashboard from "@/pages/PendingUserDashboard";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();


  // Early return pattern for cleaner routing logic
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        {/* Public routes */}
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/complete-invitation" component={CompleteInvitation} />
        <Route path="/referral-register" component={CompleteReferralRegistration} />
        <Route path="/recruit" component={CompleteReferralRegistration} />
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Authenticated user routes - clear route precedence
  return (
    <Switch>
      {/* Public routes available to authenticated users too */}
      <Route path="/referral-register" component={CompleteReferralRegistration} />
      <Route path="/recruit" component={CompleteReferralRegistration} />
      
      {/* Change password available to all authenticated users */}
      <Route path="/change-password" component={ChangePassword} />
      
      {/* Pending user specific routes */}
      {user?.status === 'pending' && (
        <>
          <Route path="/pending-dashboard" component={PendingUserDashboard} />
          <Route path="/" component={PendingUserDashboard} />
        </>
      )}
      
      {/* Non-pending user routes */}
      {user?.status !== 'pending' && (
        <>
          <Route path="/dashboard" component={UserDashboard} />
          <Route path="/kyc-upload" component={KYCUpload} />
          <Route path="/my-team" component={MyTeam} />
          <Route path="/products" component={ProductCatalog} />
          <Route path="/my-purchases" component={MyPurchases} />
          
          {/* Role-based routes */}
          {user?.role === 'founder' && <Route path="/founder" component={FounderDashboard} />}
          {user?.role === 'admin' && <Route path="/admin" component={AdminDashboard} />}
          {['mini_franchise', 'basic_franchise'].includes(user?.role || '') && (
            <Route path="/franchise" component={FranchiseDashboard} />
          )}
          
          {/* Role-based home routes */}
          {user?.role === 'founder' && <Route path="/" component={FounderDashboard} />}
          {user?.role === 'admin' && <Route path="/" component={AdminDashboard} />}
          {['mini_franchise', 'basic_franchise'].includes(user?.role || '') && (
            <Route path="/" component={FranchiseDashboard} />
          )}
          {user?.role === 'user' && <Route path="/" component={UserDashboard} />}
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
