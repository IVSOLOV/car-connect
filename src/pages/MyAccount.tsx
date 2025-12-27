import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus, Trash2, Pencil, Eye, CalendarDays, User, Camera, Building2, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import BookingCalendarModal from "@/components/BookingCalendarModal";
import ReportIssueDialog from "@/components/ReportIssueDialog";

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
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
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
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editShowCompany, setEditShowCompany] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchListings();
      fetchProfile();
    }
  }, [user]);

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

  const handleStartEditing = () => {
    setEditFirstName(profile?.first_name || "");
    setEditLastName(profile?.last_name || "");
    setEditCompanyName(profile?.company_name || "");
    setEditShowCompany(profile?.show_company_as_owner || false);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditFirstName("");
    setEditLastName("");
    setEditCompanyName("");
    setEditShowCompany(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          full_name: `${editFirstName} ${editLastName}`.trim(),
          company_name: editCompanyName,
          show_company_as_owner: editShowCompany,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? {
        ...prev,
        first_name: editFirstName,
        last_name: editLastName,
        company_name: editCompanyName,
        show_company_as_owner: editShowCompany,
      } : null);
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
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
        title="My Account | Car Rental"
        description="Manage your account and car listings"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* User Info Section */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                {/* Avatar with edit button */}
                <div className="relative">
                  <div 
                    onClick={handleAvatarClick}
                    className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-primary" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Name and email */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="companyName">Company Name (LLC)</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="companyName"
                            value={editCompanyName}
                            onChange={(e) => setEditCompanyName(e.target.value)}
                            placeholder="Your company name"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showCompany"
                          checked={editShowCompany}
                          onCheckedChange={(checked) => setEditShowCompany(checked === true)}
                        />
                        <Label htmlFor="showCompany" className="text-sm font-normal cursor-pointer">
                          Display company name as owner on listings
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button onClick={handleCancelEditing} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-foreground">{getDisplayName()}</h1>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleStartEditing}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      {profile?.company_name && !profile?.show_company_as_owner && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {profile.company_name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Issue Section */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Need Help?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Report any issues or get support from our team
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate("/support-tickets")}>
                    View Tickets
                  </Button>
                  <ReportIssueDialog />
                </div>
              </div>
            </CardContent>
          </Card>

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">
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
                        </div>
                        {listing.approval_status === "rejected" && listing.rejection_reason && (
                          <p className="text-sm text-destructive mt-1">
                            Reason: {listing.rejection_reason}
                          </p>
                        )}
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