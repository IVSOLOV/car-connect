import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import SEO from "@/components/SEO";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { VehicleTypeSelector, type VehicleType } from "@/components/VehicleTypeSelector";
import type { Listing, FuelType } from "@/types/listing";

const carMakes = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick",
  "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Ford",
  "Freightliner", "Genesis", "GMC", "Hino", "Honda", "Hyundai", "Infiniti", 
  "Isuzu", "Jaguar", "Jeep", "Kia", "Lamborghini", "Land Rover", "Lexus", 
  "Lincoln", "Lotus", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "Mini", 
  "Mitsubishi", "Nissan", "Porsche", "Ram", "Rolls-Royce", "Subaru", "Tesla", 
  "Toyota", "Volkswagen", "Volvo"
];

const modelsByMake: Record<string, string[]> = {
  "Acura": ["ILX", "TLX", "RLX", "MDX", "RDX", "NSX", "Integra"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale", "4C Spider"],
  "Aston Martin": ["DB11", "DBS", "Vantage", "DBX"],
  "Audi": ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "RS6", "RS7", "R8", "TT"],
  "Bentley": ["Continental GT", "Flying Spur", "Bentayga"],
  "BMW": ["2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "X1", "X3", "X5", "X7", "Z4", "M3", "M4", "M5", "i4", "iX"],
  "Buick": ["Encore", "Envision", "Enclave", "Encore GX"],
  "Cadillac": ["CT4", "CT5", "Escalade", "XT4", "XT5", "XT6", "Lyriq"],
  "Chevrolet": ["Spark", "Malibu", "Camaro", "Corvette", "Trax", "Equinox", "Blazer", "Traverse", "Tahoe", "Suburban", "Colorado", "Silverado", "Bolt EV", "Express Cargo", "Express Passenger", "City Express", "Low Cab Forward 3500", "Low Cab Forward 4500", "Low Cab Forward 5500", "Low Cab Forward 6500"],
  "Chrysler": ["300", "Pacifica", "Voyager"],
  "Dodge": ["Charger", "Challenger", "Durango", "Hornet", "Grand Caravan"],
  "Ferrari": ["Roma", "Portofino", "F8 Tributo", "SF90 Stradale", "812 Superfast", "296 GTB", "Purosangue"],
  "Fiat": ["500", "500X", "Ducato Cargo Van", "Ducato Passenger Van"],
  "Ford": ["Mustang", "Fusion", "Escape", "Edge", "Explorer", "Expedition", "Bronco", "Ranger", "F-150", "F-250", "Maverick", "Mustang Mach-E", "Transit Connect", "Transit Cargo Van", "Transit Passenger Van", "Transit Cargo Van High Roof", "E-Transit Cargo Van", "F-350", "F-450", "F-550", "F-650", "F-750"],
  "Freightliner": ["M2 106 Box Truck", "M2 112 Box Truck", "Sprinter Cargo Van", "Sprinter Passenger Van", "Sprinter Cab Chassis", "MT45", "MT55", "P700", "P1000", "P1200"],
  "Genesis": ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  "GMC": ["Terrain", "Acadia", "Yukon", "Canyon", "Sierra", "Hummer EV", "Savana Cargo Van", "Savana Passenger Van", "Savana Cutaway"],
  "Hino": ["195 Box Truck", "195DC Box Truck", "268 Box Truck", "268A Box Truck", "338 Box Truck", "L6 Box Truck", "L7 Box Truck", "XL7 Box Truck", "XL8 Box Truck"],
  "Honda": ["Civic", "Accord", "Insight", "HR-V", "CR-V", "Passport", "Pilot", "Odyssey", "Ridgeline"],
  "Hyundai": ["Accent", "Elantra", "Sonata", "Venue", "Kona", "Tucson", "Santa Fe", "Palisade", "Ioniq 5", "Ioniq 6"],
  "Infiniti": ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"],
  "Isuzu": ["N-Series NPR Box Truck", "N-Series NPR-HD Box Truck", "N-Series NPR-XD Box Truck", "N-Series NQR Box Truck", "N-Series NRR Box Truck", "F-Series FTR Box Truck", "F-Series FVR Box Truck", "Reach Commercial Van"],
  "Jaguar": ["XE", "XF", "F-Type", "E-Pace", "F-Pace", "I-Pace"],
  "Jeep": ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator", "Wagoneer"],
  "Kia": ["Rio", "Forte", "K5", "Stinger", "Seltos", "Sportage", "Sorento", "Telluride", "Carnival", "EV6"],
  "Lamborghini": ["Huracán", "Urus", "Revuelto"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque"],
  "Lexus": ["IS", "ES", "LS", "RC", "LC", "UX", "NX", "RX", "GX", "LX", "RZ"],
  "Lincoln": ["Corsair", "Nautilus", "Aviator", "Navigator"],
  "Lotus": ["Emira", "Evija", "Eletre"],
  "Maserati": ["Ghibli", "Quattroporte", "MC20", "Grecale", "Levante"],
  "Mazda": ["Mazda3", "Mazda6", "CX-30", "CX-5", "CX-50", "CX-9", "MX-5 Miata"],
  "McLaren": ["Artura", "GT", "720S", "765LT"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "AMG GT", "EQS", "EQE", "Sprinter Cargo Van", "Sprinter Passenger Van", "Sprinter Crew Van", "Sprinter Cab Chassis", "Metris Cargo Van", "Metris Passenger Van"],
  "Mini": ["Cooper", "Clubman", "Countryman", "Convertible"],
  "Mitsubishi": ["Mirage", "Outlander", "Outlander Sport", "Eclipse Cross", "Fuso Canter Box Truck", "Fuso FE Box Truck"],
  "Nissan": ["Versa", "Sentra", "Altima", "Maxima", "Leaf", "Kicks", "Rogue", "Murano", "Pathfinder", "Armada", "Frontier", "Titan", "Z", "NV Cargo", "NV200 Cargo Van", "NV Passenger"],
  "Porsche": ["718 Boxster", "718 Cayman", "911", "Panamera", "Taycan", "Macan", "Cayenne"],
  "Ram": ["1500", "2500", "3500", "ProMaster 1500", "ProMaster 2500", "ProMaster 3500", "ProMaster City Cargo", "ProMaster City Passenger", "ProMaster Cutaway", "4500", "5500"],
  "Rolls-Royce": ["Ghost", "Phantom", "Wraith", "Dawn", "Cullinan", "Spectre"],
  "Subaru": ["Impreza", "Legacy", "WRX", "BRZ", "Crosstrek", "Forester", "Outback", "Ascent", "Solterra"],
  "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
  "Toyota": ["Corolla", "Camry", "Avalon", "Prius", "Prius C", "GR86", "Supra", "C-HR", "RAV4", "Venza", "Highlander", "4Runner", "Sequoia", "Tacoma", "Tundra", "Land Cruiser", "Sienna"],
  "Volkswagen": ["Jetta", "Passat", "Arteon", "Golf GTI", "Golf R", "ID.4", "Taos", "Tiguan", "Atlas", "ID. Buzz Cargo", "Transporter Cargo Van"],
  "Volvo": ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90", "C40 Recharge", "VNL Box Truck", "VNR Box Truck", "FE Box Truck", "FL Box Truck"]
};

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track original values to detect price-only changes
  const [originalListing, setOriginalListing] = useState<Listing | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i);

  // Include "Other" in available models if make is selected and not "Other"
  const availableModels = make && make !== "Other" ? [...(modelsByMake[make] || []), "Other"] : [];

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

  const setMainExistingImage = (index: number) => {
    if (index === 0) return; // Already main
    setExistingImages((prev) => {
      const newArr = [...prev];
      const [selected] = newArr.splice(index, 1);
      newArr.unshift(selected);
      return newArr;
    });
  };

  const setMainNewImage = (index: number) => {
    // Move existing images to the end, make this new image first
    setNewImages((prev) => {
      const newArr = [...prev];
      const [selected] = newArr.splice(index, 1);
      newArr.unshift(selected);
      return newArr;
    });
    setNewImagePreviews((prev) => {
      const newArr = [...prev];
      const [selected] = newArr.splice(index, 1);
      newArr.unshift(selected);
      return newArr;
    });
    // Clear existing images so new image becomes first
    if (existingImages.length > 0) {
      setExistingImages([]);
    }
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
      
      navigate("/my-account");
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
    <div className="min-h-screen bg-background">
      <SEO 
        title="Edit Listing | Update Your Car"
        description="Update your vehicle listing"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
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
                Click on an image to set it as the main photo
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
                      className={`relative aspect-square cursor-pointer group ${
                        index === 0 && newImagePreviews.length === 0 ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      onClick={() => setMainExistingImage(index)}
                    >
                      <img 
                        src={url} 
                        alt={`Existing ${index + 1}`} 
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {index === 0 && newImagePreviews.length === 0 && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      {(index !== 0 || newImagePreviews.length > 0) && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Set as main</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeExistingImage(index); }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
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
                      className={`relative aspect-square cursor-pointer group ${
                        index === 0 && existingImages.length === 0 ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      onClick={() => setMainNewImage(index)}
                    >
                      <img 
                        src={preview} 
                        alt={`New ${index + 1}`} 
                        className="w-full h-full object-cover rounded-lg border-2 border-primary"
                      />
                      {index === 0 && existingImages.length === 0 && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Star className="h-3 w-3 fill-current" />
                        </div>
                      )}
                      {(index !== 0 || existingImages.length > 0) && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Set as main</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeNewImage(index); }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
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
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
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
    </div>
  );
};

export default EditListing;
