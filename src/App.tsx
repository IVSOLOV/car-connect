import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PushNotificationProvider from "@/components/PushNotificationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BecomeHost from "./pages/BecomeHost";
import GuestGuide from "./pages/GuestGuide";
import CarDetails from "./pages/CarDetails";
import ListingDetails from "./pages/ListingDetails";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import Dashboard from "./pages/Dashboard";
import MyAccount from "./pages/MyAccount";
import SavedListings from "./pages/SavedListings";
import Messages from "./pages/Messages";
import ApprovalRequests from "./pages/ApprovalRequests";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import OwnerProfile from "./pages/OwnerProfile";
import AdminPanel from "./pages/AdminPanel";
import SupportTickets from "./pages/SupportTickets";
import WriteToSupport from "./pages/WriteToSupport";
import ListingSuccess from "./pages/ListingSuccess";
import MyListings from "./pages/MyListings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PushNotificationProvider>
            <TooltipProvider>
              <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/become-host" element={<BecomeHost />} />
                <Route path="/guest-guide" element={<GuestGuide />} />
                <Route path="/car/:id" element={<CarDetails />} />
                <Route path="/listing/:id" element={<ListingDetails />} />
                <Route path="/create-listing" element={<CreateListing />} />
                <Route path="/edit-listing/:id" element={<EditListing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/my-account" element={<MyAccount />} />
                <Route path="/saved" element={<SavedListings />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/approval-requests" element={<ApprovalRequests />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/owner/:userId" element={<OwnerProfile />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/support-tickets" element={<SupportTickets />} />
                <Route path="/write-to-support" element={<WriteToSupport />} />
                <Route path="/listing-success" element={<ListingSuccess />} />
                <Route path="/my-listings" element={<MyListings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TooltipProvider>
          </PushNotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
