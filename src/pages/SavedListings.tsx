import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Eye, Trash2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Listing {
  id: string;
  year: number;
  make: string;
  model: string;
  city: string;
  state: string;
  daily_price: number;
  monthly_price: number | null;
  images: string[];
}

const SavedListings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSavedListings();
    }
  }, [user]);

  const fetchSavedListings = async () => {
    try {
      const { data: savedData, error: savedError } = await supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user?.id);

      if (savedError) throw savedError;

      if (savedData && savedData.length > 0) {
        const listingIds = savedData.map((s) => s.listing_id);
        const { data: listingsData, error: listingsError } = await supabase
          .from("listings" as any)
          .select("*")
          .in("id", listingIds);

        if (listingsError) throw listingsError;
        setSavedListings((listingsData as unknown as Listing[]) || []);
      } else {
        setSavedListings([]);
      }
    } catch (error) {
      console.error("Error fetching saved listings:", error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleUnsaveListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user?.id)
        .eq("listing_id", listingId);

      if (error) throw error;

      setSavedListings((prev) => prev.filter((l) => l.id !== listingId));
      setDeleteDialogOpen(false);
      setListingToDelete(null);
      toast({
        title: "Removed",
        description: "Listing removed from saved.",
      });
    } catch (error) {
      console.error("Error unsaving listing:", error);
      toast({
        title: "Error",
        description: "Failed to remove listing.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (listing: Listing) => {
    setListingToDelete(listing);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Saved Listings | Car Rental"
        description="View your saved car listings"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-32 sm:pt-24">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                My Saved Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSaved ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text="Loading saved listings..." />
                </div>
              ) : savedListings.length === 0 ? (
                <EmptyState
                  variant="saved"
                  actionLabel="Browse Listings"
                  onAction={() => navigate("/dashboard")}
                />
              ) : (
                <div className="space-y-4">
                  {savedListings.map((listing) => (
                    <div 
                      key={listing.id} 
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {listing.images && listing.images.length > 0 ? (
                          <img 
                            src={listing.images[0]} 
                            alt={`${listing.year} ${listing.make} ${listing.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {listing.year} {listing.make} {listing.model}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {listing.city}, {listing.state}
                        </p>
                        <p className="text-sm font-medium text-primary">
                          ${listing.daily_price}/day
                          {listing.monthly_price && ` · $${listing.monthly_price}/month`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/listing/${listing.id}`);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          title="View listing"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(listing);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Remove from saved"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from saved?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {listingToDelete?.year} {listingToDelete?.make} {listingToDelete?.model}
              </span>{" "}
              from your saved listings?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => listingToDelete && handleUnsaveListing(listingToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
};

export default SavedListings;