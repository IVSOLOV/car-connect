import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  MessageCircle,
  Share2,
  Heart,
  FileCheck,
  DollarSign,
  Send,
  X,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/types/listing";

interface OwnerProfile {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from("listings" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setListing(data as unknown as Listing);
        // Fetch owner profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, full_name, avatar_url, created_at")
          .eq("user_id", (data as any).user_id)
          .maybeSingle();
        
        if (profileData) {
          setOwner(profileData);
        }
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
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

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Listing not found</h1>
            <Link to="/" className="mt-4 inline-block text-primary hover:underline">
              Back to listings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const location = `${listing.city}, ${listing.state}`;
  const images = listing.images?.length > 0 
    ? listing.images 
    : ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80"];
  const ownerName = owner?.full_name || owner?.first_name || "Car Owner";
  const ownerInitial = ownerName[0]?.toUpperCase() || "O";
  const memberSince = owner?.created_at 
    ? new Date(owner.created_at).getFullYear().toString()
    : "2024";
  
  const isOwner = user?.id === listing.user_id;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`${title} | Car Rental`}
        description={listing.description || `Rent this ${title} in ${location}`}
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="mb-8 animate-fade-in">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                <img
                  src={images[selectedImage]}
                  alt={title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {isOwner && (
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="bg-background/80 backdrop-blur-sm"
                      onClick={() => navigate(`/edit-listing/${id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur-sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur-sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                        selectedImage === index
                          ? "ring-2 ring-primary"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge variant="secondary">{listing.make}</Badge>
                  <Badge variant="outline">
                    <FileCheck className="mr-1 h-3 w-3" />
                    {listing.title_status === "clear" ? "Clear Title" : "Rebuild Title"}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold text-foreground md:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 flex items-center text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {location}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/50 p-5 md:grid-cols-3">
                <div className="text-center">
                  <Calendar className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-semibold text-foreground">{listing.year}</p>
                </div>
                <div className="text-center">
                  <DollarSign className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Daily Rate</p>
                  <p className="font-semibold text-foreground">{formatPrice(listing.daily_price)}</p>
                </div>
                {listing.monthly_price && (
                  <div className="text-center">
                    <DollarSign className="mx-auto mb-2 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">Monthly Rate</p>
                    <p className="font-semibold text-foreground">{formatPrice(listing.monthly_price)}</p>
                  </div>
                )}
              </div>

              {listing.description && (
                <>
                  <Separator className="my-8" />
                  <div className="mb-8">
                    <h2 className="mb-4 text-xl font-bold text-foreground">Description</h2>
                    <p className="leading-relaxed text-muted-foreground">{listing.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="sticky top-24 space-y-6">
              {/* Price Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <p className="text-sm text-muted-foreground">Daily Rate</p>
                <p className="text-3xl font-bold text-gradient">{formatPrice(listing.daily_price)}<span className="text-lg font-normal text-muted-foreground">/day</span></p>
                
                {listing.monthly_price && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    or {formatPrice(listing.monthly_price)}/month
                  </p>
                )}

                <Separator className="my-5" />

                <Button className="w-full mb-3" size="lg" onClick={() => setShowMessageModal(true)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message Owner
                </Button>

                <Button variant="outline" className="w-full" size="lg">
                  <Heart className="mr-2 h-4 w-4" />
                  Save Listing
                </Button>
              </div>

              {/* Owner Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="mb-4 font-semibold text-foreground">Listed by</h3>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarFallback>{ownerInitial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{ownerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Member since {memberSince}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Owner Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-card-hover animate-scale-in mx-4">
              <button
                onClick={() => setShowMessageModal(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Contact Owner</h2>
                <p className="text-sm text-muted-foreground">
                  Send a message about {title}
                </p>
              </div>

              <div className="mb-6 flex items-center gap-4 rounded-xl bg-secondary/50 p-4">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarFallback>{ownerInitial}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{ownerName}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {memberSince}
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!messageForm.name || !messageForm.email || !messageForm.message) {
                    toast.error("Please fill in all fields");
                    return;
                  }
                  toast.success(`Message sent to ${ownerName}!`);
                  setMessageForm({ name: "", email: "", message: "" });
                  setShowMessageModal(false);
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Your Name
                    </label>
                    <Input
                      placeholder="John Doe"
                      value={messageForm.name}
                      onChange={(e) => setMessageForm({ ...messageForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Your Email
                    </label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={messageForm.email}
                      onChange={(e) => setMessageForm({ ...messageForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Message
                  </label>
                  <Textarea
                    placeholder={`Hi ${ownerName}, I'm interested in your ${title}...`}
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ListingDetails;
