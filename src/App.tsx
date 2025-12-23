import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BecomeHost from "./pages/BecomeHost";
import CarDetails from "./pages/CarDetails";
import ListingDetails from "./pages/ListingDetails";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import Dashboard from "./pages/Dashboard";
import MyAccount from "./pages/MyAccount";
import SavedListings from "./pages/SavedListings";
import Messages from "./pages/Messages";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/become-host" element={<BecomeHost />} />
              <Route path="/car/:id" element={<CarDetails />} />
              <Route path="/listing/:id" element={<ListingDetails />} />
              <Route path="/create-listing" element={<CreateListing />} />
              <Route path="/edit-listing/:id" element={<EditListing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-account" element={<MyAccount />} />
              <Route path="/saved" element={<SavedListings />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
