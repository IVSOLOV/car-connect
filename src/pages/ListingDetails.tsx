import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
  Ban,
  Star,
  Trash2,
  Copy,
  Mail,
  MessageSquare,
  Facebook,
  Twitter,
  Fuel,
  Car,
  Truck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import ReviewDialog from "@/components/ReviewDialog";
import { sendNotificationEmail } from "@/lib/notifications";
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
  company_name: string | null;
  show_company_as_owner: boolean | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
}

const ListingDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasUserSentDefaultMessage, setHasUserSentDefaultMessage] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [ownerRating, setOwnerRating] = useState<{ average: number; count: number } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // Get dates from URL params
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  
  const formatDateRange = () => {
    if (startDateParam && endDateParam) {
      try {
        const start = parseISO(startDateParam);
        const end = parseISO(endDateParam);
        return ` for ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      } catch {
        return "";
      }
    }
    return "";
  };

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
        const ownerId = (data as any).user_id;
        
        // Fetch owner profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, full_name, avatar_url, created_at, company_name, show_company_as_owner")
          .eq("user_id", ownerId)
          .maybeSingle();
        
        if (profileData) {
          setOwner(profileData);
        }

        // Fetch owner's average rating
        const { data: reviewsData } = await supabase
          .from("user_reviews")
          .select("rating")
          .eq("reviewed_id", ownerId);
        
        if (reviewsData && reviewsData.length > 0) {
          const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
          setOwnerRating({
            average: total / reviewsData.length,
            count: reviewsData.length
          });
        } else {
          setOwnerRating({ average: 0, count: 0 });
        }
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!user || !id || !listing) return;
    
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", id)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setMessages(data as Message[]);
        // Check if user already sent a message starting with the default intro
        const defaultIntro = `Hi ${getOwnerDisplayName()}, I am interested in your`;
        const hasSentDefault = data.some(
          (msg) => msg.sender_id === user.id && msg.message.startsWith(defaultIntro)
        );
        setHasUserSentDefaultMessage(hasSentDefault);

        // Check for existing review
        const { data: reviewData } = await supabase
          .from("user_reviews")
          .select("id")
          .eq("reviewer_id", user.id)
          .eq("reviewed_id", listing.user_id)
          .maybeSingle();
        
        setHasExistingReview(!!reviewData);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    if (listing && user) {
      fetchMessages();
      checkIfSaved();
    }
  }, [listing, user]);

  const checkIfSaved = async () => {
    if (!user || !id) return;
    
    try {
      const { data } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", id)
        .maybeSingle();
      
      setIsSaved(!!data);
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };

  const toggleSaveListing = async () => {
    if (!user || !id) {
      toast.error("Please login to save listings");
      return;
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", id);
        
        if (error) throw error;
        setIsSaved(false);
        toast.success("Removed from saved listings");
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: id });
        
        if (error) throw error;
        setIsSaved(true);
        toast.success("Added to saved listings");
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      toast.error("Failed to update saved listings");
    }
  };

  const sendMessage = async () => {
    if (!messageText || !user || !listing) {
      toast.error("Please enter a message");
      return;
    }

    try {
      const { error } = await supabase.from("messages").insert({
        listing_id: id,
        sender_id: user.id,
        recipient_id: listing.user_id,
        message: messageText,
      });

      if (error) throw error;

      // Get sender's profile for the email notification
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name")
        .eq("user_id", user.id)
        .single();
      
      const senderName = senderProfile?.full_name || 
        `${senderProfile?.first_name || ""} ${senderProfile?.last_name || ""}`.trim() || 
        "A user";

      const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;

      // Send email notification to the listing owner (fire and forget)
      sendNotificationEmail("message", listing.user_id, {
        senderName,
        listingTitle,
        messagePreview: messageText.substring(0, 100),
      }).catch(err => console.error("Failed to send email notification:", err));

      toast.success("Message sent!");
      setMessageText("");
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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
  const ownerName = getOwnerDisplayName();
  const ownerInitial = ownerName[0]?.toUpperCase() || "O";
  const memberSince = owner?.created_at 
    ? new Date(owner.created_at).getFullYear().toString()
    : "2024";
  
  const isOwner = user?.id === listing.user_id;
  const isAdmin = role === "admin";

  const handleDeactivateListing = async () => {
    // Only require reason for admin deactivating someone else's listing
    if (!isOwner && !deactivationReason.trim()) {
      toast.error("Please provide a reason for deactivation");
      return;
    }

    setDeactivating(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({ 
          approval_status: "deactivated",
          deactivation_reason: deactivationReason.trim()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Listing deactivated successfully");
      setShowDeactivateDialog(false);
      setDeactivationReason("");
      // Refresh the listing data
      fetchListing();
    } catch (error) {
      console.error("Error deactivating listing:", error);
      toast.error("Failed to deactivate listing");
    } finally {
      setDeactivating(false);
    }
  };

  const handleDeleteListing = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Listing deleted successfully");
      navigate("/my-account");
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Failed to delete listing");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`${title} | Car Rental`}
        description={listing.description || `Rent this ${title} in ${location}`}
      />
      <Header />

      <main className="container mx-auto px-4 pt-20 sm:pt-24 pb-8 sm:pb-12 max-w-full overflow-x-hidden">
        <Link
          to="/dashboard"
          className="mb-4 sm:mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listings
        </Link>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 min-w-0">
            {/* Image Gallery */}
            <div className="mb-6 sm:mb-8 animate-fade-in">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-xl sm:rounded-2xl w-full group">
                <img
                  src={images[selectedImage]}
                  alt={title}
                  className="h-full w-full object-cover"
                />
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10"
                      onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10"
                      onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm text-foreground text-sm px-3 py-1 rounded-full">
                      {selectedImage + 1} / {images.length}
                    </div>
                  </>
                )}
                
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="bg-background/80 backdrop-blur-sm"
                    onClick={toggleSaveListing}
                  >
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="bg-background/80 backdrop-blur-sm"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <div className="flex flex-col gap-1">
                        {typeof navigator.share !== 'undefined' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={async () => {
                              try {
                                await navigator.share({
                                  title: title,
                                  text: `Check out this ${title} for rent!`,
                                  url: window.location.href,
                                });
                              } catch (err) {
                                // User cancelled or error
                              }
                            }}
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share...
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("Link copied to clipboard!");
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            window.open(`sms:?body=Check out this ${encodeURIComponent(title)} for rent! ${encodeURIComponent(window.location.href)}`, '_blank');
                          }}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Text message
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            window.open(`mailto:?subject=${encodeURIComponent(`Check out this ${title}`)}&body=${encodeURIComponent(`I found this car rental you might like:\n\n${title}\n${window.location.href}`)}`, '_blank');
                          }}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this ${title} for rent! ${window.location.href}`)}`, '_blank');
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400');
                          }}
                        >
                          <Facebook className="mr-2 h-4 w-4" />
                          Facebook
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this ${title} for rent!`)}&url=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400');
                          }}
                        >
                          <Twitter className="mr-2 h-4 w-4" />
                          X (Twitter)
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {images.length > 1 && (
                <div className="mt-3 sm:mt-4 flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative h-16 w-24 sm:h-20 sm:w-28 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
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
              <div className="mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-4xl">
                  {title}
                </h1>
                <p className="mt-1 sm:mt-2 flex items-center text-sm sm:text-base text-muted-foreground">
                  <MapPin className="mr-1.5 sm:mr-2 h-4 w-4" />
                  {location}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 rounded-xl bg-secondary/50 p-4 sm:p-5 sm:grid-cols-2 md:grid-cols-3">
                <div className="text-center">
                  <DollarSign className="mx-auto mb-1.5 sm:mb-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Daily Rate</p>
                  <div className="flex items-center justify-center gap-2">
                    {listing.original_daily_price && listing.original_daily_price > listing.daily_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(listing.original_daily_price)}
                      </span>
                    )}
                    <p className="text-sm sm:text-base font-semibold text-foreground">{formatPrice(listing.daily_price)}</p>
                  </div>
                </div>
                {listing.weekly_price && (
                  <div className="text-center col-span-2 md:col-span-1">
                    <DollarSign className="mx-auto mb-1.5 sm:mb-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Weekly Rate</p>
                    <div className="flex items-center justify-center gap-2">
                      {listing.original_weekly_price && listing.original_weekly_price > listing.weekly_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(listing.original_weekly_price)}
                        </span>
                      )}
                      <p className="text-sm sm:text-base font-semibold text-foreground">{formatPrice(listing.weekly_price)}</p>
                    </div>
                  </div>
                )}
                {listing.monthly_price && (
                  <div className="text-center col-span-2 md:col-span-1">
                    <DollarSign className="mx-auto mb-1.5 sm:mb-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Monthly Rate</p>
                    <div className="flex items-center justify-center gap-2">
                      {listing.original_monthly_price && listing.original_monthly_price > listing.monthly_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(listing.original_monthly_price)}
                        </span>
                      )}
                      <p className="text-sm sm:text-base font-semibold text-foreground">{formatPrice(listing.monthly_price)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicle Details */}
              <Separator className="my-6 sm:my-8" />
              <div className="mb-6 sm:mb-8">
                <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold text-foreground">Vehicle Details</h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Car className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vehicle Type</p>
                      <p className="text-sm font-medium text-foreground capitalize">{listing.vehicle_type?.replace("_", " ") || "Car"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Fuel className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fuel Type</p>
                      <p className="text-sm font-medium text-foreground capitalize">{listing.fuel_type || "Gas"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Title Status</p>
                      <p className="text-sm font-medium text-foreground capitalize">{listing.title_status === "clear" ? "Clear" : "Rebuild"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Truck className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery</p>
                      <p className="text-sm font-medium text-foreground">{listing.delivery_available ? "Available" : "Not available"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {listing.description && (
                <>
                  <Separator className="my-6 sm:my-8" />
                  <div className="mb-6 sm:mb-8">
                    <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold text-foreground">Description</h2>
                    <p className="leading-relaxed text-sm sm:text-base text-muted-foreground">{listing.description}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="animate-slide-up lg:sticky lg:top-24" style={{ animationDelay: "200ms" }}>
            <div className="space-y-4 sm:space-y-6">
              {/* Price Card */}
              <div className="rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
                <p className="text-xs sm:text-sm text-muted-foreground">Daily Rate</p>
                <div className="flex items-center gap-2">
                  {listing.original_daily_price && listing.original_daily_price > listing.daily_price && (
                    <span className="text-lg sm:text-xl text-muted-foreground line-through">
                      {formatPrice(listing.original_daily_price)}
                    </span>
                  )}
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">{formatPrice(listing.daily_price)}<span className="text-sm sm:text-lg font-normal text-muted-foreground">/day</span></p>
                </div>
                
                {listing.weekly_price && (
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                    {listing.original_weekly_price && listing.original_weekly_price > listing.weekly_price && (
                      <span className="line-through mr-2">{formatPrice(listing.original_weekly_price)}</span>
                    )}
                    {formatPrice(listing.weekly_price)}/week
                  </p>
                )}
                
                {listing.monthly_price && (
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                    {listing.original_monthly_price && listing.original_monthly_price > listing.monthly_price && (
                      <span className="line-through mr-2">{formatPrice(listing.original_monthly_price)}</span>
                    )}
                    {formatPrice(listing.monthly_price)}/month
                  </p>
                )}

                <Separator className="my-4 sm:my-5" />

                {!isOwner && (
                  <Button className="w-full mb-3" size="lg" onClick={() => {
                    if (!user) {
                      toast.error("Please sign in to message the owner");
                      navigate("/auth");
                      return;
                    }
                    // Only pre-fill default message if user hasn't sent one before
                    if (!hasUserSentDefaultMessage) {
                      const defaultMessage = `Hi ${ownerName}, I am interested in your ${title}${formatDateRange()}.`;
                      setMessageText(defaultMessage);
                    } else {
                      setMessageText("");
                    }
                    setShowMessageModal(true);
                  }}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message Owner
                  </Button>
                )}

                {isOwner ? (
                  <>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => navigate(`/edit-listing/${id}`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Update Listing
                    </Button>
                    
                    {listing.approval_status !== "deactivated" && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3" 
                        size="lg"
                        onClick={() => setShowDeactivateDialog(true)}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Deactivate Listing
                      </Button>
                    )}
                    
                    <Button 
                      variant="destructive" 
                      className="w-full mt-3" 
                      size="lg"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Listing
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant={isSaved ? "default" : "outline"} 
                    className="w-full" 
                    size="lg"
                    onClick={() => {
                      if (!user) {
                        toast.error("Please sign in to save listings");
                        navigate("/auth");
                        return;
                      }
                      toggleSaveListing();
                    }}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                    {isSaved ? "Saved" : "Save Listing"}
                  </Button>
                )}

                {/* Admin Deactivate Button - admins can deactivate any listing including their own */}
                {isAdmin && !isOwner && listing.approval_status !== "deactivated" && (
                  <Button 
                    variant="destructive" 
                    className="w-full mt-3" 
                    size="lg"
                    onClick={() => setShowDeactivateDialog(true)}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Deactivate Listing
                  </Button>
                )}

                {listing.approval_status === "deactivated" && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">This listing has been deactivated</p>
                  </div>
                )}
              </div>

              {/* Owner Card - Only show for authenticated users */}
              {user && (
                <Link 
                  to={`/owner/${listing.user_id}`}
                  className="block rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:border-primary/30"
                >
                  <h3 className="mb-4 font-semibold text-foreground">Listed by</h3>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/20">
                      <AvatarImage src={owner?.avatar_url || undefined} alt={ownerName} />
                      <AvatarFallback>{ownerInitial}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{ownerName}</p>
                        {ownerRating && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-sm font-medium">{ownerRating.average.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({ownerRating.count})</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Member since {memberSince}
                      </p>
                    </div>
                  </div>
                </Link>
              )}
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
                  <AvatarImage src={owner?.avatar_url || undefined} alt={ownerName} />
                  <AvatarFallback>{ownerInitial}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{ownerName}</p>
                  <p className="text-sm text-muted-foreground">
                    Member since {memberSince}
                  </p>
                </div>
              </div>

              {/* Message History */}
              {messages.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Previous messages</p>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg text-sm ${
                        msg.sender_id === user?.id
                          ? "bg-primary/10 ml-4"
                          : "bg-secondary mr-4"
                      }`}
                    >
                      <p className="text-foreground">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Review Prompt - Show after 5+ messages with responses from both sides */}
              {user && listing && !isOwner && !hasExistingReview && messages.length >= 5 && 
               messages.some(m => m.sender_id === user.id) && 
               messages.some(m => m.sender_id === listing.user_id) && (
                <div className="mb-4 p-3 rounded-lg bg-accent/30 border border-accent flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Star className="h-4 w-4 text-yellow-500 shrink-0" />
                    <span className="text-sm truncate">How was your experience with {ownerName}?</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowReviewDialog(true)}
                    className="shrink-0"
                  >
                    Rate
                  </Button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Message
                  </label>
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                    className="resize-none"
                    placeholder="Type your message..."
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={!user}>
                  <Send className="mr-2 h-4 w-4" />
                  {user ? "Send Message" : "Login to Send"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Deactivation Dialog */}
        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Listing</DialogTitle>
              <DialogDescription>
                {isOwner 
                  ? "You are about to deactivate this listing. It will no longer be visible to other users."
                  : `You are about to deactivate: ${title}. Please provide a reason that will be sent to the owner.`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deactivation-reason">Reason for Deactivation</Label>
                <Textarea
                  id="deactivation-reason"
                  placeholder={isOwner ? "Optional: Why are you deactivating this listing?" : "Please explain why this listing is being deactivated..."}
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeactivateListing}
                disabled={deactivating || (!isOwner && !deactivationReason.trim())}
              >
                {deactivating ? "Deactivating..." : "Deactivate Listing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Listing</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete "{title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteListing}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        {user && listing && !isOwner && (
          <ReviewDialog
            open={showReviewDialog}
            onOpenChange={setShowReviewDialog}
            reviewedUserId={listing.user_id}
            reviewedUserName={ownerName}
            listingId={listing.id}
            reviewerId={user.id}
            onReviewSubmitted={() => {
              setHasExistingReview(true);
              fetchMessages();
            }}
          />
        )}
      </main>
    </div>
  );
};

export default ListingDetails;
