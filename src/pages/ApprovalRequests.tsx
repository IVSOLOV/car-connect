import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/notifications";
import type { Listing } from "@/types/listing";

interface ListingWithProfile extends Listing {
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  };
}

const ApprovalRequests = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingListing, setRejectingListing] = useState<ListingWithProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || role !== "admin")) {
      navigate("/");
      return;
    }

    if (user && role === "admin") {
      fetchPendingListings();
    }
  }, [user, role, authLoading, navigate]);

  const fetchPendingListings = async () => {
    setLoading(true);
    try {
      console.log("Fetching pending listings...");
      
      // First fetch pending listings
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      console.log("Listings query result:", { listingsData, listingsError });

      if (listingsError) throw listingsError;

      if (!listingsData || listingsData.length === 0) {
        console.log("No pending listings found");
        setListings([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(listingsData.map((l) => l.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, company_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Map profiles to listings
      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p]) || []
      );

      const listingsWithProfiles: ListingWithProfile[] = listingsData.map((listing) => ({
        ...listing,
        profiles: profilesMap.get(listing.user_id) || undefined,
      }));

      console.log("Setting listings:", listingsWithProfiles.length);
      setListings(listingsWithProfiles);
    } catch (error) {
      console.error("Error fetching pending listings:", error);
      toast.error("Failed to fetch pending listings");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listing: ListingWithProfile) => {
    try {
      const { error } = await supabase
        .from("listings")
        .update({ approval_status: "approved", rejection_reason: null })
        .eq("id", listing.id);

      if (error) throw error;

      // Send email notification to listing owner
      const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;
      sendNotificationEmail("listing_approved", listing.user_id, {
        listingTitle,
      }).catch(err => console.error("Failed to send email notification:", err));

      toast.success("Listing approved successfully");
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (error) {
      console.error("Error approving listing:", error);
      toast.error("Failed to approve listing");
    }
  };

  const openRejectDialog = (listing: ListingWithProfile) => {
    setRejectingListing(listing);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingListing) return;
    
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const { error } = await supabase
        .from("listings")
        .update({ 
          approval_status: "rejected",
          rejection_reason: rejectionReason.trim()
        })
        .eq("id", rejectingListing.id);

      if (error) throw error;

      // Send email notification to listing owner
      const listingTitle = `${rejectingListing.year} ${rejectingListing.make} ${rejectingListing.model}`;
      sendNotificationEmail("listing_rejected", rejectingListing.user_id, {
        listingTitle,
        rejectionReason: rejectionReason.trim(),
      }).catch(err => console.error("Failed to send email notification:", err));

      toast.success("Listing rejected");
      setListings((prev) => prev.filter((l) => l.id !== rejectingListing.id));
      setRejectDialogOpen(false);
      setRejectingListing(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Error rejecting listing:", error);
      toast.error("Failed to reject listing");
    }
  };

  const getOwnerName = (listing: ListingWithProfile) => {
    const profile = listing.profiles;
    if (!profile) return "Unknown";
    if (profile.company_name) return profile.company_name;
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return "Unknown";
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Approval Requests | Admin"
        description="Review and approve pending car listings"
      />
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Approval Requests</h1>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Check className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No pending approval requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0">
                      <img
                        src={listing.images?.[0] || "/placeholder.svg"}
                        alt={`${listing.year} ${listing.make} ${listing.model}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {listing.year} {listing.make} {listing.model}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {listing.city}, {listing.state}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>

                      <div className="flex flex-wrap justify-between gap-4 text-sm mb-4">
                        <div className="space-y-1">
                          <div>
                            <span className="text-muted-foreground">Owner:</span>{" "}
                            <span className="text-foreground">{getOwnerName(listing)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Title Status:</span>{" "}
                            <span className="text-foreground capitalize">{listing.title_status}</span>
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div>
                            <span className="text-muted-foreground">Daily Price:</span>{" "}
                            <span className="text-foreground">{formatPrice(listing.daily_price)}</span>
                          </div>
                          {listing.weekly_price && (
                            <div>
                              <span className="text-muted-foreground">Weekly:</span>{" "}
                              <span className="text-foreground">{formatPrice(listing.weekly_price)}</span>
                            </div>
                          )}
                          {listing.monthly_price && (
                            <div>
                              <span className="text-muted-foreground">Monthly:</span>{" "}
                              <span className="text-foreground">{formatPrice(listing.monthly_price)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {listing.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {listing.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/listing/${listing.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(listing)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(listing)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
            <DialogDescription>
              {rejectingListing && (
                <>Rejecting: {rejectingListing.year} {rejectingListing.make} {rejectingListing.model}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for Rejection</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please explain why this listing is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalRequests;
