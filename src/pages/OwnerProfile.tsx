import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/types/listing";

interface OwnerData {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  company_name: string | null;
  show_company_as_owner: boolean | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name?: string;
}

const OwnerProfile = () => {
  const { userId } = useParams();
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchOwnerData();
    }
  }, [userId]);

  const fetchOwnerData = async () => {
    try {
      // Fetch owner profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name, avatar_url, created_at, company_name, show_company_as_owner")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setOwner(profileData);
      }

      // Fetch owner's approved listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", userId)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (listingsData) {
        setListings(listingsData as unknown as Listing[]);
      }

      // Fetch reviews for this owner
      const { data: reviewsData } = await supabase
        .from("user_reviews")
        .select("*")
        .eq("reviewed_id", userId)
        .order("created_at", { ascending: false });

      if (reviewsData && reviewsData.length > 0) {
        // Fetch reviewer names
        const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))];
        const { data: reviewerProfiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, full_name")
          .in("user_id", reviewerIds);

        const reviewsWithNames = reviewsData.map(review => {
          const reviewer = reviewerProfiles?.find(p => p.user_id === review.reviewer_id);
          return {
            ...review,
            reviewer_name: reviewer?.full_name || `${reviewer?.first_name || ""} ${reviewer?.last_name || ""}`.trim() || "Anonymous"
          };
        });

        setReviews(reviewsWithNames);

        const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
        setAverageRating({
          average: total / reviewsData.length,
          count: reviewsData.length
        });
      }
    } catch (error) {
      console.error("Error fetching owner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOwnerDisplayName = () => {
    if (owner?.show_company_as_owner && owner?.company_name) {
      return owner.company_name;
    }
    if (owner?.full_name) {
      return owner.full_name;
    }
    if (owner?.first_name || owner?.last_name) {
      return `${owner.first_name || ""} ${owner.last_name || ""}`.trim();
    }
    return "Car Owner";
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Owner not found</h1>
            <Link to="/" className="mt-4 inline-block text-primary hover:underline">
              Back to listings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ownerName = getOwnerDisplayName();
  const ownerInitial = ownerName[0]?.toUpperCase() || "O";
  const memberSince = new Date(owner.created_at).getFullYear().toString();

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`${ownerName} | Car Rental`}
        description={`View listings and reviews for ${ownerName}`}
      />
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listings
        </Link>

        {/* Owner Profile Header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8 animate-fade-in">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarFallback className="text-2xl">{ownerInitial}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{ownerName}</h1>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-medium">{averageRating.average.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({averageRating.count} reviews)</span>
                </div>
              </div>
              <p className="text-muted-foreground">Member since {memberSince}</p>
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="mb-12 animate-slide-up">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Listings ({listings.length})
          </h2>
          
          {listings.length === 0 ? (
            <p className="text-muted-foreground">No active listings</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Link key={listing.id} to={`/listing/${listing.id}`}>
                  <Card className="overflow-hidden transition-all hover:shadow-card-hover hover:-translate-y-1">
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={listing.images?.[0] || "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80"}
                        alt={`${listing.year} ${listing.make} ${listing.model}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-1">
                        {listing.year} {listing.make} {listing.model}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        {listing.city}, {listing.state}
                      </p>
                      <p className="text-primary font-bold">
                        {formatPrice(listing.daily_price)}/day
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* Reviews Section */}
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-xl font-bold text-foreground mb-6">
            Reviews ({reviews.length})
          </h2>
          
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{review.reviewer_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-foreground">{review.reviewer_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {renderStars(review.rating)}
                      {review.comment && (
                        <p className="mt-2 text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OwnerProfile;
