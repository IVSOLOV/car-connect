import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus, Trash2, Pencil, Eye, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import SEO from "@/components/SEO";
import BookingCalendarModal from "@/components/BookingCalendarModal";

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
  created_at: string;
  approval_status: "pending" | "approved" | "rejected" | "deactivated";
  rejection_reason: string | null;
  deactivation_reason: string | null;
}

const MyListings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings" as any)
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings((data as unknown as Listing[]) || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast({
        title: "Error",
        description: "Failed to load your listings.",
        variant: "destructive",
      });
    } finally {
      setLoadingListings(false);
    }
  };

  const handleDeleteClick = (listing: Listing) => {
    setListingToDelete(listing);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listingToDelete) return;
    
    try {
      const { error } = await supabase
        .from("listings" as any)
        .delete()
        .eq("id", listingToDelete.id);

      if (error) throw error;

      setListings((prev) => prev.filter((listing) => listing.id !== listingToDelete.id));
      toast({
        title: "Listing Deleted",
        description: "Your listing has been removed.",
      });
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast({
        title: "Error",
        description: "Failed to delete listing.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setListingToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="My Listings | Car Rental"
        description="Manage your car listings"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-32">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                My Listings
              </CardTitle>
              <Button onClick={() => navigate("/create-listing")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Listing
              </Button>
            </CardHeader>
            <CardContent>
              {loadingListings ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't listed any cars yet.</p>
                  <Button 
                    onClick={() => navigate("/create-listing")} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Create Your First Listing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <div 
                      key={listing.id} 
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                              {listing.year} {listing.make} {listing.model}
                            </h3>
                            {listing.approval_status === "approved" && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                                Listed
                              </Badge>
                            )}
                            {listing.approval_status === "pending" && (
                              <Badge variant="secondary" className="text-xs">
                                Pending Review
                              </Badge>
                            )}
                            {listing.approval_status === "rejected" && (
                              <Badge variant="destructive" className="text-xs">
                                Rejected
                              </Badge>
                            )}
                            {listing.approval_status === "deactivated" && (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                                Deactivated
                              </Badge>
                            )}
                          </div>
                          {listing.approval_status === "rejected" && listing.rejection_reason && (
                            <p className="text-xs sm:text-sm text-destructive mt-1">
                              Reason: {listing.rejection_reason}
                            </p>
                          )}
                          {listing.approval_status === "deactivated" && listing.deactivation_reason && (
                            <p className="text-xs sm:text-sm text-orange-500 mt-1">
                              Reason: {listing.deactivation_reason}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {listing.city}, {listing.state}
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-primary">
                            ${listing.daily_price}/day
                            {listing.monthly_price && ` · $${listing.monthly_price}/month`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 sm:flex-shrink-0 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/listing/${listing.id}`)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="View listing"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedListing(listing);
                            setShowBookingModal(true);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Manage bookings"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Edit listing"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteClick(listing)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete listing"
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

        {/* Booking Calendar Modal */}
        {selectedListing && (
          <BookingCalendarModal
            listingId={selectedListing.id}
            listingTitle={`${selectedListing.year} ${selectedListing.make} ${selectedListing.model}`}
            isOpen={showBookingModal}
            onClose={() => {
              setShowBookingModal(false);
              setSelectedListing(null);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                {listingToDelete && (
                  <>
                    You are about to delete <strong>{listingToDelete.year} {listingToDelete.make} {listingToDelete.model}</strong>. 
                    This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, keep it</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default MyListings;
