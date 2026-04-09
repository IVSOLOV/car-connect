import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Star, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { VehicleTypeSelector, type VehicleType } from "@/components/VehicleTypeSelector";
import type { Listing, FuelType } from "@/types/listing";

import { carMakes, modelsByMake, usStates } from "@/data/vehicleData";

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [dragExistingIndex, setDragExistingIndex] = useState<number | null>(null);
  const [dragNewIndex, setDragNewIndex] = useState<number | null>(null);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [customMake, setCustomMake] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [titleStatus, setTitleStatus] = useState("clear");
  const [dailyPrice, setDailyPrice] = useState("");
  const [weeklyPrice, setWeeklyPrice] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [fuelType, setFuelType] = useState<FuelType>("gas");
  const [licensePlate, setLicensePlate] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track original values to detect price-only changes
  const [originalListing, setOriginalListing] = useState<Listing | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i);

  // Include "Other" in available models if make is selected and not "Other"
  const availableModels = make && make !== "Other" ? [...(modelsByMake[make] || []).sort((a, b) => a.localeCompare(b)), "Other"] : [];

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (id) {
      fetchListing();
    }
  }, [user, id, navigate]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from("listings" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ title: "Listing not found", variant: "destructive" });
        navigate("/my-account");
        return;
      }

      const listing = data as unknown as Listing;

      // Check if user is the owner
      if (listing.user_id !== user?.id) {
        toast({ title: "Unauthorized", description: "You can only edit your own listings.", variant: "destructive" });
        navigate("/my-account");
        return;
      }

      // Store original listing for comparison
      setOriginalListing(listing);
      
      // Populate form - check if make/model are custom (not in predefined lists)
      const isCustomMake = !carMakes.includes(listing.make);
      const isCustomModel = !isCustomMake && !(modelsByMake[listing.make] || []).includes(listing.model);
      
      setYear(listing.year.toString());
      
      if (isCustomMake) {
        setMake("Other");
        setCustomMake(listing.make);
        setCustomModel(listing.model);
      } else {
        setMake(listing.make);
        if (isCustomModel) {
          setModel("Other");
          setCustomModel(listing.model);
        } else {
          setModel(listing.model);
        }
      }
      
      setCity(listing.city);
      setState(listing.state);
      setTitleStatus(listing.title_status);
      setDailyPrice(listing.daily_price.toString());
      setWeeklyPrice(listing.weekly_price?.toString() || "");
      setMonthlyPrice(listing.monthly_price?.toString() || "");
      setDescription(listing.description || "");
      setVehicleType((listing.vehicle_type as VehicleType) || "car");
      setFuelType((listing.fuel_type as FuelType) || "gas");
      setExistingImages(listing.images || []);
      setDeliveryAvailable((listing as any).delivery_available || false);

      // Fetch sensitive data (license plate) from separate table
      const { data: sensitiveData } = await supabase
        .from("listing_sensitive_data" as any)
        .select("license_plate")
        .eq("listing_id", id)
        .maybeSingle();

      if (sensitiveData) {
        setLicensePlate((sensitiveData as any).license_plate || "");
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast({ title: "Error", description: "Failed to load listing.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;
    
    if (totalImages > 10) {
      toast({
        title: "Too many images",
        description: "You can have up to 10 images total.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates by comparing file size and name with already added new images
    const duplicates: string[] = [];
    const uniqueFiles: File[] = [];

    for (const file of files) {
      const isDuplicateNew = newImages.some(
        (existingFile) =>
          existingFile.name === file.name &&
          existingFile.size === file.size &&
          existingFile.type === file.type
      );

      if (isDuplicateNew) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.push(file);
      }
    }

    if (duplicates.length > 0) {
      toast({
        title: "Duplicate images detected",
        description: `The following images were already added: ${duplicates.join(", ")}`,
        variant: "destructive",
      });
    }

    if (uniqueFiles.length === 0) return;
    
    setNewImages((prev) => [...prev, ...uniqueFiles]);
    
    uniqueFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderExistingImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setExistingImages((prev) => {
      const newArr = [...prev];
      const [moved] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, moved);
      return newArr;
    });
  };

  const reorderNewImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setNewImages((prev) => {
      const newArr = [...prev];
      const [moved] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, moved);
      return newArr;
    });
    setNewImagePreviews((prev) => {
      const newArr = [...prev];
      const [moved] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, moved);
      return newArr;
    });
  };

  const rotateExistingImage = async (index: number) => {
    const url = existingImages[index];
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const canvas = document.createElement("canvas");
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    // Convert existing image to a new image and move it to newImages
    const res = await fetch(rotatedDataUrl);
    const blob = await res.blob();
    const rotatedFile = new File([blob], `rotated-existing-${index}.jpg`, { type: "image/jpeg" });
    // Remove from existing, add to new
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setNewImages((prev) => [...prev, rotatedFile]);
    setNewImagePreviews((prev) => [...prev, rotatedDataUrl]);
    canvas.width = 0;
    canvas.height = 0;
  };

  const rotateNewImage = async (index: number) => {
    const preview = newImagePreviews[index];
    if (!preview) return;
    const img = new Image();
    img.src = preview;
    await new Promise((resolve) => { img.onload = resolve; });
    const canvas = document.createElement("canvas");
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const res = await fetch(rotatedDataUrl);
    const blob = await res.blob();
    const originalFile = newImages[index];
    const rotatedFile = new File([blob], originalFile.name, { type: "image/jpeg" });
    setNewImages((prev) => prev.map((f, i) => (i === index ? rotatedFile : f)));
    setNewImagePreviews((prev) => prev.map((p, i) => (i === index ? rotatedDataUrl : p)));
    canvas.width = 0;
    canvas.height = 0;
  };

  const handlePriceChange = (value: string, setter: (val: string) => void) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setter(numericValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine final make and model values
    const finalMake = make === "Other" ? customMake.trim() : make;
    const finalModel = make === "Other" ? customModel.trim() : (model === "Other" ? customModel.trim() : model);
    
    const totalImages = existingImages.length + newImages.length;
    if (totalImages < 5) {
      toast({
        title: "Not Enough Photos",
        description: `At least 5 photos are required. You currently have ${totalImages}.`,
        variant: "destructive",
      });
      return;
    }

    if (!year || !finalMake || !finalModel || !city || !state || !licensePlate.trim() || !dailyPrice) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields including license plate.",
        variant: "destructive",
      });
      return;
    }

    if (parseInt(dailyPrice) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Daily rate must be greater than $0.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please sign in to update the listing.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate license plate in the same state (now in listing_sensitive_data table, excluding current listing)
    const { data: existingSensitiveData } = await supabase
      .from('listing_sensitive_data' as any)
      .select('listing_id')
      .ilike('license_plate', licensePlate.trim())
      .eq('state', state)
      .neq('listing_id', id)
      .maybeSingle();

    if (existingSensitiveData) {
      toast({
        title: "Vehicle Already Listed",
        description: "A vehicle with this license plate is already listed in this state.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload new images to storage
      const uploadedImageUrls: string[] = [...existingImages];
      
      for (const image of newImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('car-photos')
          .upload(fileName, image);
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('car-photos')
          .getPublicUrl(fileName);
        
        uploadedImageUrls.push(publicUrl);
      }

      // Determine if changes are minor (only price decrease or image reorder)
      const newDailyPrice = parseInt(dailyPrice);
      const newWeeklyPrice = weeklyPrice ? parseInt(weeklyPrice) : null;
      const newMonthlyPrice = monthlyPrice ? parseInt(monthlyPrice) : null;
      
      // Check if images are the same (regardless of order)
      const sameImages = JSON.stringify([...uploadedImageUrls].sort()) === JSON.stringify([...(originalListing?.images || [])].sort());
      
      // Check if non-image, non-price, non-vehicle-type fields changed (these require admin approval)
      const coreFieldsUnchanged = originalListing && 
        parseInt(year) === originalListing.year &&
        make === originalListing.make &&
        model === originalListing.model &&
        city === originalListing.city &&
        state === originalListing.state &&
        titleStatus === originalListing.title_status &&
        (description || null) === (originalListing.description || null);
      
      // Check if prices only decreased (or stayed same)
      const pricesNotIncreased = originalListing &&
        newDailyPrice <= originalListing.daily_price &&
        (newWeeklyPrice === null || originalListing.weekly_price === null || newWeeklyPrice <= originalListing.weekly_price) &&
        (newMonthlyPrice === null || originalListing.monthly_price === null || newMonthlyPrice <= originalListing.monthly_price);
      
      // Skip approval if only image order changed, price decreased, or vehicle type changed
      const skipApproval = coreFieldsUnchanged && sameImages && pricesNotIncreased;

      // Build update object (license_plate is stored separately)
      const updateData: Record<string, any> = {
        year: parseInt(year),
        make: finalMake,
        model: finalModel,
        city,
        state,
        title_status: titleStatus,
        vehicle_type: vehicleType,
        fuel_type: fuelType,
        daily_price: newDailyPrice,
        weekly_price: newWeeklyPrice,
        monthly_price: newMonthlyPrice,
        description: description || null,
        delivery_available: deliveryAvailable,
        images: uploadedImageUrls,
      };

      // If minor changes only (price decrease or image reorder), keep current approval status
      if (skipApproval && originalListing.approval_status === "approved") {
        // Set original daily price for showing discount (use existing original or current price)
        const existingOriginalDailyPrice = (originalListing as any).original_daily_price;
        if (newDailyPrice < originalListing.daily_price) {
          updateData.original_daily_price = existingOriginalDailyPrice || originalListing.daily_price;
        }
        // Set original weekly price for showing discount
        const existingOriginalWeeklyPrice = (originalListing as any).original_weekly_price;
        if (newWeeklyPrice !== null && originalListing.weekly_price !== null && newWeeklyPrice < originalListing.weekly_price) {
          updateData.original_weekly_price = existingOriginalWeeklyPrice || originalListing.weekly_price;
        }
        // Set original monthly price for showing discount
        const existingOriginalMonthlyPrice = (originalListing as any).original_monthly_price;
        if (newMonthlyPrice !== null && originalListing.monthly_price !== null && newMonthlyPrice < originalListing.monthly_price) {
          updateData.original_monthly_price = existingOriginalMonthlyPrice || originalListing.monthly_price;
        }
        // Keep approved status - no admin review needed
      } else {
        // Other changes require admin approval
        updateData.approval_status = "pending";
        updateData.original_daily_price = null; // Reset original price on full update
        updateData.original_weekly_price = null;
        updateData.original_monthly_price = null;
      }

      const { error } = await supabase
        .from('listings' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update license plate in sensitive data table (upsert)
      if (licensePlate.trim()) {
        const { error: sensitiveError } = await supabase
          .from('listing_sensitive_data' as any)
          .upsert({
            listing_id: id,
            license_plate: licensePlate.trim().toUpperCase(),
            state: state,
          }, { onConflict: 'listing_id' });

        if (sensitiveError) {
          console.error("Error updating sensitive data:", sensitiveError);
          // Non-blocking - listing was updated successfully
        }
      }

      const successMessage = skipApproval && originalListing?.approval_status === "approved"
        ? "Your changes have been saved."
        : "Your changes have been submitted for admin approval.";

      toast({
        title: "Listing Updated",
        description: successMessage,
      });
      
      navigate("/my-listings");
    } catch (error) {
      console.error("Error updating listing:", error);
      toast({
        title: "Error",
        description: "Failed to update listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title="Edit Listing | Update Your Car"
        description="Update your vehicle listing"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => navigate("/dashboard")} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <h1 className="text-3xl font-bold text-foreground mb-8">Edit Listing</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Images</Label>
              
              <p className="text-sm text-muted-foreground">
                Drag and drop images to reorder. First image (⭐) is the main photo.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                ⚠ To keep listings clear and trustworthy, please upload photos of only one vehicle per listing.
              </p>
              
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                  {existingImages.map((url, index) => (
                    <div 
                      key={`existing-${index}`} 
                      draggable
                      onDragStart={() => setDragExistingIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragExistingIndex !== null) { reorderExistingImages(dragExistingIndex, index); setDragExistingIndex(null); } }}
                      onDragEnd={() => setDragExistingIndex(null)}
                      className={`relative aspect-square cursor-grab active:cursor-grabbing group ${
                        index === 0 && newImagePreviews.length === 0 ? "ring-2 ring-primary ring-offset-2" : ""
                      } ${dragExistingIndex === index ? "opacity-50" : ""}`}
                    >
                      <img 
                        src={url} 
                        alt={`Existing ${index + 1}`} 
                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                      />
                      {index === 0 && newImagePreviews.length === 0 && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); rotateExistingImage(index); }}
                        className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
                        title="Rotate image"
                      >
                        <RotateCw className="h-8 w-8 text-white/30 hover:text-white/70 transition-colors drop-shadow-md" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeExistingImage(index); }}
                        className="img-delete-btn absolute -top-0.5 -right-0.5 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-px transition-colors z-20"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Image Previews */}
              {newImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                  {newImagePreviews.map((preview, index) => (
                    <div 
                      key={`new-${index}`} 
                      draggable
                      onDragStart={() => setDragNewIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragNewIndex !== null) { reorderNewImages(dragNewIndex, index); setDragNewIndex(null); } }}
                      onDragEnd={() => setDragNewIndex(null)}
                      className={`relative aspect-square cursor-grab active:cursor-grabbing group ${
                        index === 0 && existingImages.length === 0 ? "ring-2 ring-primary ring-offset-2" : ""
                      } ${dragNewIndex === index ? "opacity-50" : ""}`}
                    >
                      <img 
                        src={preview} 
                        alt={`New ${index + 1}`} 
                        className="w-full h-full object-cover rounded-lg border-2 border-primary pointer-events-none"
                      />
                      {index === 0 && existingImages.length === 0 && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); rotateNewImage(index); }}
                        className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
                        title="Rotate image"
                      >
                        <RotateCw className="h-8 w-8 text-white/30 hover:text-white/70 transition-colors drop-shadow-md" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeNewImage(index); }}
                        className="img-delete-btn absolute -top-0.5 -right-0.5 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-px transition-colors z-20"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {Capacitor.isNativePlatform() ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Add more images ({existingImages.length + newImages.length}/10)
                    </span>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={async () => {
                        try {
                          const photo = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Uri, quality: 80, width: 1600, correctOrientation: true });
                          if (!photo.webPath) return;
                          const resp = await fetch(photo.webPath);
                          const blob = await resp.blob();
                          const fmt = (photo.format || blob.type.split("/")[1] || "jpeg").replace("jpeg", "jpg");
                          const file = new File([blob], `edit-${Date.now()}.${fmt}`, { type: blob.type || `image/${fmt === "jpg" ? "jpeg" : fmt}` });
                          const totalImages = existingImages.length + newImages.length + 1;
                          if (totalImages > 10) { toast({ title: "Too many images", description: "Maximum 10 images.", variant: "destructive" }); return; }
                          setNewImages(prev => [...prev, file]);
                          setNewImagePreviews(prev => [...prev, URL.createObjectURL(file)]);
                        } catch (e) { if (/cancel/i.test(String(e))) return; toast({ title: "Photo capture failed", variant: "destructive" }); }
                      }}>
                        📷 Take Photo
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={async () => {
                        try {
                          const remaining = 10 - existingImages.length - newImages.length;
                          if (remaining <= 0) { toast({ title: "Maximum images reached", variant: "destructive" }); return; }
                          const result = await Camera.pickImages({ quality: 80, width: 1600, correctOrientation: true, limit: remaining });
                          const files: File[] = [];
                          for (const p of result.photos) {
                            if (!p.webPath) continue;
                            const resp = await fetch(p.webPath);
                            const blob = await resp.blob();
                            const fmt = (p.format || blob.type.split("/")[1] || "jpeg").replace("jpeg", "jpg");
                            files.push(new File([blob], `edit-${Date.now()}-${Math.random().toString(36).slice(2,6)}.${fmt}`, { type: blob.type || `image/${fmt === "jpg" ? "jpeg" : fmt}` }));
                          }
                          const totalImages = existingImages.length + newImages.length + files.length;
                          if (totalImages > 10) {
                            toast({ title: "Too many images", description: "Maximum 10 images total.", variant: "destructive" });
                            return;
                          }
                          setNewImages(prev => [...prev, ...files]);
                          setNewImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                        } catch (e) { if (/cancel/i.test(String(e))) return; toast({ title: "Photo selection failed", variant: "destructive" }); }
                      }}>
                        🖼 Choose from Library
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label 
                  htmlFor="image-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Click to add more images ({existingImages.length + newImages.length}/10)
                  </span>
                </label>
              </div>
              )}
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <Label>Vehicle Type *</Label>
              <VehicleTypeSelector value={vehicleType} onChange={setVehicleType} />
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Make */}
            <div className="space-y-2">
              <Label htmlFor="make">Make *</Label>
              <Select value={make} onValueChange={(val) => { 
                setMake(val); 
                setModel(""); 
                setCustomModel("");
                if (val !== "Other") setCustomMake("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {carMakes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {make === "Other" && (
                <Input
                  placeholder="Enter custom make"
                  value={customMake}
                  onChange={(e) => setCustomMake(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              {make === "Other" ? (
                <Input
                  placeholder="Enter custom model"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                />
              ) : (
                <>
                  <Select value={model} onValueChange={(val) => {
                    setModel(val);
                    if (val !== "Other") setCustomModel("");
                  }} disabled={!make}>
                    <SelectTrigger>
                      <SelectValue placeholder={make ? "Select model" : "Select make first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {model === "Other" && (
                    <Input
                      placeholder="Enter custom model"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location *</Label>
              <LocationAutocomplete
                onLocationSelect={(selectedCity, selectedState) => {
                  setCity(selectedCity);
                  setState(selectedState);
                }}
                initialCity={city}
                initialState={state}
                placeholder="Start typing a city..."
              />
            </div>

            {/* License Plate & Registration State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate *</Label>
                <Input
                  id="licensePlate"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Enter plate number"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationState">Registration State *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title Status */}
            <div className="space-y-2">
              <Label>Title Status *</Label>
              <RadioGroup value={titleStatus} onValueChange={setTitleStatus} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clear" id="clear" />
                  <Label htmlFor="clear" className="cursor-pointer">Clear</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rebuild" id="rebuild" />
                  <Label htmlFor="rebuild" className="cursor-pointer">Rebuild</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Fuel Type */}
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <RadioGroup value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)} className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gas" id="gas" />
                  <Label htmlFor="gas" className="cursor-pointer">Gas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="diesel" id="diesel" />
                  <Label htmlFor="diesel" className="cursor-pointer">Diesel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hybrid" id="hybrid" />
                  <Label htmlFor="hybrid" className="cursor-pointer">Hybrid</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="electric" id="electric" />
                  <Label htmlFor="electric" className="cursor-pointer">Electric</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer">Other</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Delivery Available */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="deliveryAvailable"
                checked={deliveryAvailable}
                onCheckedChange={(checked) => setDeliveryAvailable(checked === true)}
              />
              <div>
                <Label htmlFor="deliveryAvailable" className="cursor-pointer font-medium">
                  Delivery Available
                </Label>
                <p className="text-sm text-muted-foreground">
                  I can deliver the car to the guest's location
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyPrice">Daily Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="dailyPrice"
                    value={dailyPrice}
                    onChange={(e) => handlePriceChange(e.target.value, setDailyPrice)}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyPrice">Weekly Price (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="weeklyPrice"
                    value={weeklyPrice}
                    onChange={(e) => handlePriceChange(e.target.value, setWeeklyPrice)}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Monthly Price (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="monthlyPrice"
                    value={monthlyPrice}
                    onChange={(e) => handlePriceChange(e.target.value, setMonthlyPrice)}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your vehicle, features, rental terms, etc."
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> A good description helps attract more renters. Include key features, condition, and any rental terms.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Listing"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditListing;
