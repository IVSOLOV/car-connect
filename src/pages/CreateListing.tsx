import { useState, useEffect, useCallback } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Star, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useListingSubscription } from "@/hooks/useListingSubscription";
import type { FuelType } from "@/types/listing";
import { getUniqueListingFiles } from "@/lib/listingImageFiles";

import { carMakes, modelsByMake, usStates } from "@/data/vehicleData";

const MAX_IMAGES = 10;

const CreateListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLoading: subLoading, checkSubscription, startCheckout, canCreateListing } = useListingSubscription();

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i);

  const recoverPendingCheckout = useCallback(async () => {
    const pendingListing = localStorage.getItem("pendingListing");
    const checkoutPending = localStorage.getItem("listingCheckoutPending");

    if (!pendingListing || !checkoutPending) return false;

    try {
      console.log("[CreateListing] Recovering pending checkout (verifying via Stripe)...");
      for (let attempt = 0; attempt < 6; attempt += 1) {
        console.log(`[CreateListing] Recovery attempt ${attempt + 1}/6`);
        const { data, error } = await supabase.functions.invoke("check-listing-subscription");

        if (error) throw error;

        if ((data?.availableSlots ?? 0) > 0) {
          console.log("[CreateListing] Subscription confirmed by backend");
          localStorage.removeItem("listingCheckoutPending");
          setAwaitingPayment(false);
          setIsSubmitting(false);
          // Navigate WITHOUT a session_id; ListingSuccess legacy fallback will trust this
          // because backend already confirmed an active/trialing subscription exists.
          navigate("/listing-success?payment=success", { replace: true });
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Never confirmed — treat as failed so user isn't stuck on success page.
      console.warn("[CreateListing] Subscription not confirmed after retries; marking as failed");
      localStorage.removeItem("listingCheckoutPending");
      setIsSubmitting(false);
      setAwaitingPayment(false);
      navigate("/listing-success?payment=failed", { replace: true });
    } catch (error) {
      console.error("[CreateListing] Failed to recover checkout:", error);
      setIsSubmitting(false);
      setAwaitingPayment(false);
    }

    return false;
  }, [navigate]);

  // Include "Other" in available models if make is selected and not "Other"
  const availableModels = make && make !== "Other" ? [...(modelsByMake[make] || []).sort((a, b) => a.localeCompare(b)), "Other"] : [];

  // Handle payment success redirect (if user lands back on create-listing after Stripe)
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      localStorage.removeItem("listingCheckoutPending");
      setAwaitingPayment(false);
      setIsSubmitting(false);
      checkSubscription();
      navigate("/listing-success?payment=success", { replace: true });
      return;
    }

    if (paymentStatus === "canceled") {
      localStorage.removeItem("listingCheckoutPending");
      setAwaitingPayment(false);
      setIsSubmitting(false);
      navigate("/listing-success?payment=canceled", { replace: true });
      return;
    }

    if (!isSubmitting) {
      void recoverPendingCheckout();
    }
  }, [searchParams, navigate, checkSubscription, isSubmitting, recoverPendingCheckout]);

  // On iOS/Capacitor, detect app returning from background after Stripe payment.
  // When isSubmitting is true and the app resumes, check if pendingListing exists
  // and redirect to listing-success since Stripe completed in external Safari.
  useEffect(() => {
    const checkoutPending = localStorage.getItem("listingCheckoutPending");
    if (!isSubmitting && !checkoutPending) return;

    let appStateListener: PluginListenerHandle | undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void recoverPendingCheckout();
      }
    };

    const handleWindowFocus = () => {
      void recoverPendingCheckout();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;

        void recoverPendingCheckout();
      }).then((handle) => {
        appStateListener = handle;
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      appStateListener?.remove();
    };
  }, [isSubmitting, recoverPendingCheckout]);

  // Check if user is a host
  useEffect(() => {
    const checkHostRole = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "host")
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Host access required",
          description: "You need to become a host before creating listings.",
          variant: "destructive",
        });
        navigate("/become-host");
      }
    };

    checkHostRole();
  }, [user, navigate, toast]);

  useEffect(() => {
    if (make) {
      setModel("");
    }
  }, [make]);

  const addImageFiles = async (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: `You already have ${MAX_IMAGES} images. Remove some to add new ones.`,
        variant: "destructive",
      });
      return;
    }

    const { duplicateFiles, filesToAdd, overflowCount } = await getUniqueListingFiles({
      existingFiles: images,
      incomingFiles,
      maxFiles: MAX_IMAGES,
    });

    if (duplicateFiles.length > 0) {
      toast({
        title: "Duplicate images detected",
        description: `The following images were already added: ${duplicateFiles.map((file) => file.name).join(", ")}`,
        variant: "destructive",
      });
    }

    if (filesToAdd.length === 0) return;

    if (overflowCount > 0) {
      toast({
        title: "Some images not added",
        description: `Only ${filesToAdd.length} more image${filesToAdd.length === 1 ? " was" : "s were"} added. Maximum is ${MAX_IMAGES} images.`,
      });
    }

    setImages((prev) => [...prev, ...filesToAdd]);

    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const ensureNativePhotoPermission = async () => {
    const permissions = await Camera.checkPermissions();

    if (permissions.photos === "prompt" || permissions.photos === "prompt-with-rationale") {
      await Camera.requestPermissions({ permissions: ["photos"] });
    }

    const updatedPermissions = await Camera.checkPermissions();

    if (updatedPermissions.photos !== "granted" && updatedPermissions.photos !== "limited") {
      throw new Error("Photo library permission not granted");
    }
  };

  const getNativePhotoSource = (photo: { webPath?: string; path?: string | null }) => {
    if (photo.webPath) return photo.webPath;
    if (photo.path) return Capacitor.convertFileSrc(photo.path);
    throw new Error("No image path returned from photo library");
  };

  const handleNativeTakePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 80,
        width: 1600,
        correctOrientation: true,
      });

      if (!photo.webPath) {
        throw new Error("No image path returned from camera");
      }

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const format = (photo.format || blob.type.split("/")[1] || "jpeg").replace("jpeg", "jpg");
      const mimeType = blob.type || `image/${format === "jpg" ? "jpeg" : format}`;
      const file = new File([blob], `listing-${Date.now()}.${format}`, { type: mimeType });

        await addImageFiles([file]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(errorMessage)) return;
      console.error("[CreateListing] Native take photo failed:", error);
      toast({ title: "Photo capture failed", description: "Could not open the camera. Please try again.", variant: "destructive" });
    }
  };

  const handleNativePickMultiple = async () => {
    try {
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        toast({ title: "Maximum images reached", description: `You can have up to ${MAX_IMAGES} images.`, variant: "destructive" });
        return;
      }

      await ensureNativePhotoPermission();

      const result = await Camera.pickImages({
        quality: 80,
        width: 1600,
        correctOrientation: true,
        limit: 0,
        presentationStyle: "fullscreen",
      });

      const photos = result.photos.slice(0, remaining);
      const files: File[] = [];
      for (const photo of photos) {
        const source = getNativePhotoSource(photo);
        const response = await fetch(source);
        const blob = await response.blob();
        const format = (photo.format || blob.type.split("/")[1] || "jpeg").replace("jpeg", "jpg");
        const mimeType = blob.type || `image/${format === "jpg" ? "jpeg" : format}`;
        files.push(new File([blob], `listing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${format}`, { type: mimeType }));
      }

        if (files.length > 0) {
          await addImageFiles(files);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(errorMessage)) return;
      console.error("[CreateListing] Native pick multiple failed:", error);
      toast({ title: "Photo selection failed", description: "Could not open photo library. Please try again.", variant: "destructive" });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await addImageFiles(files);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    // Revoke blob URL to free memory
    const preview = imagePreviews[index];
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setImages((prev) => {
      const newArr = [...prev];
      const [moved] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, moved);
      return newArr;
    });
    setImagePreviews((prev) => {
      const newArr = [...prev];
      const [moved] = newArr.splice(fromIndex, 1);
      newArr.splice(toIndex, 0, moved);
      return newArr;
    });
  };

  const rotateImage = async (index: number) => {
    const preview = imagePreviews[index];
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
    const originalFile = images[index];
    const rotatedFile = new File([blob], originalFile.name, { type: "image/jpeg" });
    setImages((prev) => prev.map((f, i) => (i === index ? rotatedFile : f)));
    setImagePreviews((prev) => prev.map((p, i) => (i === index ? rotatedDataUrl : p)));
    canvas.width = 0;
    canvas.height = 0;
  };

  const handlePriceChange = (value: string, setter: (val: string) => void) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setter(numericValue);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            if (data.address) {
              setCity(data.address.city || data.address.town || data.address.village || "");
              const stateAbbr = data.address.state;
              if (stateAbbr && usStates.includes(stateAbbr)) {
                setState(stateAbbr);
              }
            }
          } catch (error) {
            toast({
              title: "Location Error",
              description: "Could not get location details. Please enter manually.",
              variant: "destructive",
            });
          }
        },
        () => {
          toast({
            title: "Location Access Denied",
            description: "Please enable location access or enter your city manually.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine final make and model values
    const finalMake = make === "Other" ? customMake.trim() : make;
    const finalModel = make === "Other" ? customModel.trim() : (model === "Other" ? customModel.trim() : model);
    
    if (images.length < 5) {
      toast({
        title: "Not Enough Images",
        description: "Please upload at least 5 images of your vehicle.",
        variant: "destructive",
      });
      return;
    }
    
    const missingFields: string[] = [];
    if (!year) missingFields.push("Year");
    if (!finalMake) missingFields.push("Make");
    if (!finalModel) missingFields.push("Model");
    if (!city) missingFields.push("City");
    if (!state) missingFields.push("State");
    if (!licensePlate.trim()) missingFields.push("License Plate");
    if (!dailyPrice) missingFields.push("Daily Price");
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
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
        description: "Please sign in to create a listing.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate license plate in the same state (now in listing_sensitive_data table)
    const { data: existingListing } = await supabase
      .from('listing_sensitive_data' as any)
      .select('id')
      .ilike('license_plate', licensePlate.trim())
      .eq('state', state)
      .maybeSingle();

    if (existingListing) {
      toast({
        title: "Vehicle Already Listed",
        description: "A vehicle with this license plate is already listed in this state.",
        variant: "destructive",
      });
      return;
    }

    // Always redirect to Stripe for payment - every listing costs $4.99/month
    setIsSubmitting(true);
    try {
      // Upload images to storage in parallel (much faster than sequential)
      const uploadResults = await Promise.all(
        images.map(async (image) => {
          const fileExt = image.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('car-photos')
            .upload(fileName, image);
          
          if (uploadError) {
            console.error("Upload error:", uploadError);
            return null;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('car-photos')
            .getPublicUrl(fileName);
          
          return publicUrl;
        })
      );
      const uploadedImageUrls = uploadResults.filter((url): url is string => url !== null);

      if (uploadedImageUrls.length < 5) {
        throw new Error("Failed to upload enough images. Please try again.");
      }

      // Save listing data with uploaded URLs (small payload, no quota issues)
      const pendingListing = {
        year,
        make: finalMake,
        model: finalModel,
        city,
        state,
        licensePlate,
        titleStatus,
        vehicleType,
        fuelType,
        dailyPrice,
        weeklyPrice,
        monthlyPrice,
        description,
        deliveryAvailable,
        imageUrls: uploadedImageUrls,
      };
      localStorage.setItem("pendingListing", JSON.stringify(pendingListing));
      localStorage.setItem("listingCheckoutPending", "true");
      
      // Start checkout - may redirect to Stripe or update existing subscription
      const result = await startCheckout(1);
      
      if (result?.url) {
        console.log("[CreateListing] Redirecting to Stripe:", result.url);
        setAwaitingPayment(true);
        window.location.href = result.url;
        return new Promise(() => {});
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("[CreateListing] Checkout error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      setIsSubmitting(false);
    }
  };

  // Show waiting state when user is completing Stripe payment in another tab
  if (awaitingPayment) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEO title="Complete Payment | DiRent" description="Complete your payment to list your vehicle" />
        <Header />
        <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
          <div className="max-w-lg mx-auto">
            <Card className="border-primary/20 bg-card/50 backdrop-blur">
              <CardContent className="pt-8 pb-8 text-center space-y-6">
                <div className="flex justify-center">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">Complete Your Payment</h1>
                  <p className="text-muted-foreground">
                    A Stripe checkout page has opened in a new tab. Please complete your payment there.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>After successful payment, you'll be redirected back here automatically.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.removeItem("pendingListing");
                    setAwaitingPayment(false);
                  }}
                >
                  Cancel & Go Back to Form
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title="Create Listing | List Your Car"
        description="List your vehicle for rent"
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

          <h1 className="text-3xl font-bold text-foreground mb-4">Vehicle Details</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Upload Pictures/Images *</Label>
              <p className="text-sm text-muted-foreground">
                Minimum 5 images required ({images.length}/5 uploaded)
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                ⚠ To keep listings clear and trustworthy, please upload photos of only one vehicle per listing.
              </p>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                images.length < 5 ? "border-destructive/50" : "border-border"
              }`}>
                {Capacitor.isNativePlatform() ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">
                      Add images (min 5, max {MAX_IMAGES}) — {images.length}/{MAX_IMAGES} added
                    </span>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={handleNativeTakePhoto}>
                        📷 Take Photo
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleNativePickMultiple}>
                        🖼 Choose from Library
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
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
                        Click to upload images (min 5, max 10)
                      </span>
                    </label>
                  </>
                )}
              </div>
              
              {imagePreviews.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mt-4">
                    Drag and drop images to reorder. First image (⭐) is the main photo.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                    {imagePreviews.map((preview, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => { if (dragIndex !== null) { reorderImages(dragIndex, index); setDragIndex(null); } }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`relative aspect-square cursor-grab active:cursor-grabbing group ${
                          index === 0 ? "ring-2 ring-primary ring-offset-2" : ""
                        } ${dragIndex === index ? "opacity-50" : ""}`}
                      >
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg pointer-events-none"
                        />
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                            <Star className="h-3 w-3 fill-current" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); rotateImage(index); }}
                          className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
                          title="Rotate image"
                        >
                          <RotateCw className="h-8 w-8 text-white/30 hover:text-white/70 transition-colors drop-shadow-md" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                          className="img-delete-btn absolute -top-0.5 -right-0.5 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-px transition-colors z-20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
              </>
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

            {/* Fuel Type (Optional) */}
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
                <Label htmlFor="weeklyPrice">Weekly Price</Label>
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
                <Label htmlFor="monthlyPrice">Monthly Price</Label>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your vehicle..."
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> A good description helps attract more renters. Include key features, condition, and any rental terms.
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              variant="hero" 
              size="lg" 
              className="w-full" 
              disabled={isSubmitting || subLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {!canCreateListing ? "Processing..." : "Creating..."}
                </>
              ) : (
                "Create Listing"
              )}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateListing;
