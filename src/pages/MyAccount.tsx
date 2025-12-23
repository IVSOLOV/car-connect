import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus, Trash2, Pencil, Eye, CalendarDays, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  show_company_as_owner: boolean | null;
  avatar_url: string | null;
}

const MyAccount = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchListings();
      fetchProfile();
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

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, company_name, show_company_as_owner, avatar_url")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

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

  const handleDeleteListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from("listings" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      setListings((prev) => prev.filter((listing) => listing.id !== id));
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
    }
  };

  const getDisplayName = () => {
    if (profile?.show_company_as_owner && profile?.company_name) {
      return profile.company_name;
    }
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return "User";
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
        title="My Account | Car Rental"
        description="Manage your account and car listings"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* User Info Section */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{getDisplayName()}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          {/* My Listings Section */}
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
                      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
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
                          onClick={() => navigate(`/listing/${listing.id}`)}
                          className="text-muted-foreground hover:text-foreground"
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
                          className="text-muted-foreground hover:text-primary"
                          title="Manage bookings"
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          className="text-muted-foreground hover:text-primary"
                          title="Edit listing"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteListing(listing.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

          {/* Saved Listings Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                My Saved Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSaved ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : savedListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't saved any listings yet.</p>
                  <Button 
                    onClick={() => navigate("/")} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Browse Listings
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedListings.map((listing) => (
                    <div 
                      key={listing.id} 
                      className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
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
                          onClick={() => navigate(`/listing/${listing.id}`)}
                          className="text-muted-foreground hover:text-foreground"
                          title="View listing"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleUnsaveListing(listing.id)}
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
      </main>
    </div>
  );
};

export default MyAccount;
