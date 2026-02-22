import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Car, Search, Loader2 } from "lucide-react";
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
  const { user, loading } = useAuth();
  const { checkSubscription } = useListingSubscription();
  const { toast } = useToast();
  const [hasWaited, setHasWaited] = useState(false);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [listingCreated, setListingCreated] = useState(false);

  // Give auth time to restore from Stripe redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 1500); // Wait 1.5 seconds for session to restore
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
    // Refresh subscription status after successful payment
    if (user) {
      checkSubscription();
    }
  }, [checkSubscription, user]);

  // Create the pending listing after successful payment
  useEffect(() => {
    const createPendingListing = async () => {
      if (!user || isCreatingListing || listingCreated) return;
      
      const pendingListingData = localStorage.getItem("pendingListing");
      
      if (!pendingListingData) {
        // No pending listing - user might have already created it or came here directly
        return;
      }

      setIsCreatingListing(true);

      try {
        const listing = JSON.parse(pendingListingData);

        // Images were already uploaded to storage before Stripe redirect
        const uploadedImageUrls: string[] = listing.imageUrls || [];

        // Create listing in database
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
          toast({
            title: "Error",
            description: "Failed to create listing. Please try again from the create listing page.",
            variant: "destructive",
          });
        } else {
          // Store license plate in sensitive data table
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

          // Clear pending data on success
          localStorage.removeItem("pendingListing");
          setListingCreated(true);
          
          // Get user's name for admin notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, full_name")
            .eq("user_id", user.id)
            .single();
          
          const submitterName = profile?.first_name || profile?.full_name || "A user";
          const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;
          
          // Notify admins about new pending listing
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
        toast({
          title: "Error",
          description: "Something went wrong. Please try creating your listing again.",
          variant: "destructive",
        });
      } finally {
        setIsCreatingListing(false);
      }
    };

    if (user && hasWaited) {
      createPendingListing();
    }
  }, [user, hasWaited, isCreatingListing, listingCreated, toast]);

  // Only redirect to auth if we're absolutely sure there's no session
  // Give multiple attempts to restore the session before giving up
  useEffect(() => {
    if (!loading && hasWaited && !user) {
      // Try to get session one more time
      const attemptSessionRestore = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Still no session after waiting - redirect to auth
          console.log("[ListingSuccess] No session found after waiting, redirecting to auth");
          navigate("/auth");
        }
      };
      
      const finalCheck = setTimeout(() => {
        attemptSessionRestore();
      }, 2000);
      return () => clearTimeout(finalCheck);
    }
  }, [user, loading, hasWaited, navigate]);

  // Show loading while auth state is being restored or listing is being created
  if (loading || !hasWaited || isCreatingListing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <LoadingSpinner />
        {isCreatingListing && (
          <p className="text-muted-foreground animate-pulse">Creating your listing...</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                  Thanks for joining DiRent! Your payment info is saved and your 30-day free trial has started.
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
