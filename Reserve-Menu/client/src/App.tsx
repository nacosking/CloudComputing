import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import ReservationsPage from "@/pages/reservations";
import PaymentPage from "@/pages/payment";
import { AuthProvider } from "@/contexts/auth-context";
import AdminPage from "@/pages/AdminPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/reservations" component={ReservationsPage} />
      <Route path="/payment" component={PaymentPage} />

      {/* MOVE ADMIN HERE, BEFORE THE CATCH-ALL */}
      <Route path="/admin/menu" component={AdminPage} />

      {/* This must always be last */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
