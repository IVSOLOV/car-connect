import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus, Trash2, Pencil, Eye, CalendarDays, User, Camera, Building2, Loader2, HelpCircle, Mail, AlertTriangle, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import Footer from "@/components/Footer";
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
  approval_status: "pending" | "approved" | "rejected" | "deactivated";
  rejection_reason: string | null;
  deactivation_reason: string | null;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  show_company_as_owner: boolean | null;
  avatar_url: string | null;
  phone: string | null;
}

// Email Verification Card Component
const EmailVerificationCard = ({ email }: { email: string }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-auth-email', {
        body: {
          type: 'confirmation',
          email: email,
          redirect_to: `${window.location.origin}/auth?verified=true`,
        },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link.",
      });
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mb-8 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Not Verified
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your email address ({email}) has not been verified yet. Please verify your email to ensure full access to all features.
            </p>
            <div className="mt-3">
              {sent ? (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Verification email sent! Check your inbox.
                </div>
              ) : (
                <Button 
                  onClick={handleResendVerification} 
                  disabled={sending}
                  size="sm"
                  variant="outline"
                  className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Small inline verify email button
const EmailVerifyButton = ({ email }: { email: string }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-auth-email', {
        body: {
          type: 'confirmation',
          email,
          redirect_to: `${window.location.origin}/auth?verified=true`,
        },
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Verification email sent!
      </p>
    );
  }

  return (
    <Button
      onClick={handleVerify}
      disabled={sending}
      variant="link"
      size="sm"
      className="h-auto p-0 mt-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700"
    >
      {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Mail className="mr-1 h-3 w-3" />}
      {sending ? "Sending..." : "Verify Email"}
    </Button>
  );
};

const MyAccount = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editShowCompany, setEditShowCompany] = useState(false);
  const [editPhone, setEditPhone] = useState("");
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

      // Fetch phone from private_profiles
      let phone: string | null = null;
      const { data: privateData } = await supabase
        .from("private_profiles")
        .select("phone")
        .eq("user_id", user?.id!)
        .single();
      if (privateData) phone = privateData.phone;

      setProfile({ ...data, phone });
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
    setEditPhone(profile?.phone || "");
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditFirstName("");
    setEditLastName("");
    setEditCompanyName("");
    setEditShowCompany(false);
    setEditPhone("");
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

      // Update phone in private_profiles
      const { error: phoneError } = await supabase
        .from("private_profiles")
        .update({ phone: editPhone })
        .eq("user_id", user.id);

      if (phoneError) throw phoneError;

      setProfile((prev) => prev ? {
        ...prev,
        first_name: editFirstName,
        last_name: editLastName,
        company_name: editCompanyName,
        show_company_as_owner: editShowCompany,
        phone: editPhone,
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
      
      <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Email Verification Section - Show if email not confirmed */}
          {user && !user.email_confirmed_at && (
            <EmailVerificationCard email={user.email || ""} />
          )}

          {/* User Info Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 sm:gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div 
                    onClick={handleAvatarClick}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
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

                {/* Form fields */}
                <div className="flex-1 min-w-0">
                  {/* Edit icon row */}
                  <div className="flex justify-end mb-2">
                    {!isEditing && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleStartEditing}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* First & Last Name */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-xs sm:text-sm">First Name</Label>
                        <Input
                          id="firstName"
                          value={isEditing ? editFirstName : (profile?.first_name || "")}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First name"
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-muted/50 cursor-default" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-xs sm:text-sm">Last Name</Label>
                        <Input
                          id="lastName"
                          value={isEditing ? editLastName : (profile?.last_name || "")}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last name"
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-muted/50 cursor-default" : ""}
                        />
                      </div>
                    </div>

                    {/* Email (always read-only) */}
                    <div>
                      <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          value={user?.email || ""}
                          readOnly
                          className="pl-10 pr-10 bg-muted/50 cursor-default"
                        />
                        {user?.email_confirmed_at && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {user && !user.email_confirmed_at && (
                        <EmailVerifyButton email={user.email || ""} />
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={isEditing ? editPhone : (profile?.phone || "")}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="Phone number"
                          readOnly={!isEditing}
                          className={`pl-10 ${!isEditing ? "bg-muted/50 cursor-default" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Company Name */}
                    <div>
                      <Label htmlFor="companyName" className="text-xs sm:text-sm">Company Name (LLC)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          value={isEditing ? editCompanyName : (profile?.company_name || "")}
                          onChange={(e) => setEditCompanyName(e.target.value)}
                          placeholder="Your company name"
                          readOnly={!isEditing}
                          className={`pl-10 ${!isEditing ? "bg-muted/50 cursor-default" : ""}`}
                        />
                      </div>
                    </div>

                    {/* Show company checkbox */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showCompany"
                        checked={isEditing ? editShowCompany : (profile?.show_company_as_owner || false)}
                        onCheckedChange={(checked) => isEditing && setEditShowCompany(checked === true)}
                        disabled={!isEditing}
                      />
                      <Label htmlFor="showCompany" className="text-xs sm:text-sm font-normal cursor-pointer">
                        Display company name as owner on listings
                      </Label>
                    </div>

                    {/* Save / Cancel buttons */}
                    {isEditing && (
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
                    )}
                  </div>
                </div>
              </div>
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
      <Footer />
    </div>
  );
};

export default MyAccount;