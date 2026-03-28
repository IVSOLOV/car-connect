import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Car, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useListingSubscription } from "@/hooks/useListingSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { sendNotificationEmail } from "@/lib/notifications";

const ListingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { checkSubscription } = useListingSubscription();
  const { toast } = useToast();
  const [hasWaited, setHasWaited] = useState(false);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [listingCreated, setListingCreated] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);

  // Check payment status via URL params
  const paymentStatus = searchParams.get("payment");
  const wasCanceled = paymentStatus === "canceled";
  const wasUpdated = paymentStatus === "updated";

  // Give auth time to restore from Stripe redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Actively try to restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("[ListingSuccess] Session restored:", session.user.email);
        }
      } catch (error) {
        console.error("[ListingSuccess] Error restoring session:", error);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [checkSubscription, user]);

  // Create the pending listing after successful payment (NOT if canceled)
  useEffect(() => {
    const createPendingListing = async () => {
      if (!user || isCreatingListing || listingCreated || wasCanceled) return;
      
      const pendingListingData = localStorage.getItem("pendingListing");
      
      if (!pendingListingData) {
        return;
      }

      setIsCreatingListing(true);

      try {
        const listing = JSON.parse(pendingListingData);
        const uploadedImageUrls: string[] = listing.imageUrls || [];

        const { data, error } = await supabase
          .from('listings' as any)
          .insert({
            user_id: user.id,
            year: parseInt(listing.year),
            make: listing.make,
            model: listing.model,
            city: listing.city,
            state: listing.state,
            title_status: listing.titleStatus,
            vehicle_type: listing.vehicleType,
            fuel_type: listing.fuelType,
            daily_price: parseInt(listing.dailyPrice),
            weekly_price: listing.weeklyPrice ? parseInt(listing.weeklyPrice) : null,
            monthly_price: listing.monthlyPrice ? parseInt(listing.monthlyPrice) : null,
            description: listing.description || null,
            images: uploadedImageUrls,
            delivery_available: listing.deliveryAvailable || false,
            approval_status: 'pending',
          })
          .select('id')
          .single();

        if (error) {
          console.error("Error creating listing:", error);
          setPaymentFailed(true);
        } else {
          const listingData = data as any;
          if (listingData?.id && listing.licensePlate?.trim()) {
            const { error: sensitiveError } = await supabase
              .from('listing_sensitive_data' as any)
              .insert({
                listing_id: listingData.id,
                license_plate: listing.licensePlate.trim().toUpperCase(),
                state: listing.state,
              });
            if (sensitiveError) {
              console.error("Error saving sensitive data:", sensitiveError);
            }
          }

          localStorage.removeItem("pendingListing");
          setListingCreated(true);
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, full_name")
            .eq("user_id", user.id)
            .single();
          
          const submitterName = profile?.first_name || profile?.full_name || "A user";
          const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;
          
          sendNotificationEmail("admin_new_listing", null, {
            listingTitle,
            submitterName,
          }).catch(err => console.error("Failed to send admin notification:", err));
          
          toast({
            title: "🚗 Listing Created!",
            description: "Your vehicle has been submitted for approval.",
          });
        }
      } catch (error) {
        console.error("Error processing pending listing:", error);
        setPaymentFailed(true);
      } finally {
        setIsCreatingListing(false);
      }
    };

    if (user && hasWaited) {
      createPendingListing();
    }
  }, [user, hasWaited, isCreatingListing, listingCreated, wasCanceled, toast]);

  // Keep trying to restore session
  useEffect(() => {
    if (!loading && hasWaited && !user) {
      const retryInterval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("[ListingSuccess] Session restored on retry:", session.user.email);
          clearInterval(retryInterval);
        }
      }, 3000);
      return () => clearInterval(retryInterval);
    }
  }, [user, loading, hasWaited]);

  // Show loading while creating listing
  if (isCreatingListing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <LoadingSpinner />
        <p className="text-muted-foreground animate-pulse">Creating your listing...</p>
      </div>
    );
  }

  // Payment was canceled or failed
  if (wasCanceled || paymentFailed) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEO title="Payment Issue | DiRent" description="Payment was not completed" />
        <Header />
        <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
          <div className="max-w-lg mx-auto">
            <Card className="border-destructive/20 bg-card/50 backdrop-blur">
              <CardContent className="pt-8 pb-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-destructive/10 p-4">
                    <XCircle className="h-16 w-16 text-destructive" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    Vehicle Not Listed
                  </h1>
                   <p className="text-lg text-muted-foreground">
                     Your payment was not completed. Your vehicle has not been listed.
                   </p>
                 </div>
                 <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                   <p>
                     Each listing requires a $4.99/month fee. Please try again to complete your payment and activate your listing.
                   </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={() => {
                      localStorage.removeItem("pendingListing");
                      navigate("/create-listing");
                    }}
                    className="flex-1 gap-2"
                  >
                    <Car className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="flex-1"
                  >
                    Browse Cars
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title="Success! | DiRent"
        description="Your subscription is active"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
        <div className="max-w-lg mx-auto">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle className="h-16 w-16 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  🎉 You're All Set!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Your 30-day free trial has started! Your payment method is saved and you'll be charged $4.99/month per listing after the trial ends.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  Your listing will be reviewed by our team and go live within 24 hours. 
                  You'll receive an email notification once it's approved!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={() => navigate("/create-listing")} 
                  className="flex-1 gap-2"
                >
                  <Car className="h-4 w-4" />
                  List Another Vehicle
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/my-account")} 
                  className="flex-1 gap-2"
                >
                  <Car className="h-4 w-4" />
                  My Listings
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => navigate("/dashboard")}
                className="text-muted-foreground"
              >
                Browse All Cars
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListingSuccess;
