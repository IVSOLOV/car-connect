import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Car, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useListingSubscription } from "@/hooks/useListingSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

// Helper to convert base64 data URL to File
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

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
    }, 3000); // Wait 3 seconds before allowing redirect
    return () => clearTimeout(timer);
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
      const pendingImagesData = localStorage.getItem("pendingListingImages");
      
      if (!pendingListingData) {
        // No pending listing - user might have already created it or came here directly
        return;
      }

      setIsCreatingListing(true);

      try {
        const listing = JSON.parse(pendingListingData);
        const imageDataUrls: string[] = pendingImagesData ? JSON.parse(pendingImagesData) : [];

        // Convert base64 images back to files and upload
        const uploadedImageUrls: string[] = [];
        
        for (let i = 0; i < imageDataUrls.length; i++) {
          const dataUrl = imageDataUrls[i];
          const imageInfo = listing.images[i];
          const file = dataURLtoFile(dataUrl, imageInfo?.name || `image-${i}.jpg`);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('car-photos')
            .upload(fileName, file);
          
          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('car-photos')
            .getPublicUrl(fileName);
          
          uploadedImageUrls.push(publicUrl);
        }

        // Create listing in database
        const { error } = await supabase
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
            approval_status: 'pending',
          });

        if (error) {
          console.error("Error creating listing:", error);
          toast({
            title: "Error",
            description: "Failed to create listing. Please try again from the create listing page.",
            variant: "destructive",
          });
        } else {
          // Clear pending data on success
          localStorage.removeItem("pendingListing");
          localStorage.removeItem("pendingListingImages");
          setListingCreated(true);
          
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

  // Only redirect to auth AFTER loading is complete, we've waited, AND there's no user
  useEffect(() => {
    if (!loading && hasWaited && !user) {
      // Give it one more attempt to restore session
      const finalCheck = setTimeout(() => {
        if (!user) {
          navigate("/auth");
        }
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
      
      <main className="container mx-auto px-4 py-8 pt-24">
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
                  onClick={() => navigate("/dashboard")} 
                  className="flex-1 gap-2"
                >
                  <Car className="h-4 w-4" />
                  My Listings
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => navigate("/my-account")}
                className="text-muted-foreground"
              >
                Go to My Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ListingSuccess;
