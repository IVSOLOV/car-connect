import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
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
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
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
        // Fetch owner profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, full_name, avatar_url, created_at, company_name, show_company_as_owner")
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
    if (!deactivationReason.trim()) {
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

                {!isOwner && (
                  <Button className="w-full mb-3" size="lg" onClick={() => {
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
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => navigate(`/edit-listing/${id}`)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Update Listing
                  </Button>
                ) : (
                  <Button 
                    variant={isSaved ? "default" : "outline"} 
                    className="w-full" 
                    size="lg"
                    onClick={toggleSaveListing}
                    disabled={!user}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                    {isSaved ? "Saved" : "Save Listing"}
                  </Button>
                )}

                {/* Admin Deactivate Button */}
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
                You are about to deactivate: {title}. Please provide a reason that will be sent to the owner.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deactivation-reason">Reason for Deactivation</Label>
                <Textarea
                  id="deactivation-reason"
                  placeholder="Please explain why this listing is being deactivated..."
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
                disabled={deactivating}
              >
                {deactivating ? "Deactivating..." : "Deactivate Listing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ListingDetails;
