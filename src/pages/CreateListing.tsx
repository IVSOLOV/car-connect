import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useListingSubscription } from "@/hooks/useListingSubscription";
import type { FuelType } from "@/types/listing";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1929 }, (_, i) => currentYear - i);

  // Include "Other" in available models if make is selected and not "Other"
  const availableModels = make && make !== "Other" ? [...(modelsByMake[make] || []), "Other"] : [];

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast({
        title: "🎉 Welcome Aboard!",
        description: "Your 30-day free trial has started! Now let's get your vehicle listed and earning.",
      });
      checkSubscription();
      // Clear the URL params
      navigate("/create-listing", { replace: true });
    } else if (paymentStatus === "canceled") {
      toast({
        title: "Payment Canceled",
        description: "No worries! You can start your free trial whenever you're ready.",
        variant: "destructive",
      });
      navigate("/create-listing", { replace: true });
    }
  }, [searchParams, toast, navigate, checkSubscription]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Calculate how many more images we can accept
    const remainingSlots = 10 - images.length;
    
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: "You already have 10 images. Remove some to add new ones.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates by comparing file size and name
    const duplicates: string[] = [];
    const newFiles: File[] = [];

    for (const file of files) {
      const isDuplicate = images.some(
        (existingFile) =>
          existingFile.name === file.name &&
          existingFile.size === file.size &&
          existingFile.type === file.type
      );

      if (isDuplicate) {
        duplicates.push(file.name);
      } else {
        newFiles.push(file);
      }
    }

    if (duplicates.length > 0) {
      toast({
        title: "Duplicate images detected",
        description: `The following images were already added: ${duplicates.join(", ")}`,
        variant: "destructive",
      });
    }

    if (newFiles.length === 0) return;

    // Only take as many files as we have slots for
    const filesToAdd = newFiles.slice(0, remainingSlots);
    const skippedCount = newFiles.length - filesToAdd.length;

    if (skippedCount > 0) {
      toast({
        title: "Some images not added",
        description: `Only ${filesToAdd.length} of ${newFiles.length} images were added. Maximum is 10 images.`,
      });
    }

    setImages((prev) => [...prev, ...filesToAdd]);
    
    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const setMainImage = (index: number) => {
    if (index === 0) return; // Already main
    setImages((prev) => {
      const newArr = [...prev];
      const [selected] = newArr.splice(index, 1);
      newArr.unshift(selected);
      return newArr;
    });
    setImagePreviews((prev) => {
      const newArr = [...prev];
      const [selected] = newArr.splice(index, 1);
      newArr.unshift(selected);
      return newArr;
    });
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

    // If no subscription, save listing data to localStorage and redirect to Stripe checkout
    if (!canCreateListing) {
      setIsSubmitting(true);
      try {
        // Save listing data to localStorage before redirect
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
          images: images.map(img => ({ name: img.name, type: img.type, size: img.size })),
        };
        localStorage.setItem("pendingListing", JSON.stringify(pendingListing));
        
        // Store image files as base64 for retrieval after payment
        const imagePromises = images.map(img => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(img);
          });
        });
        const imageDataUrls = await Promise.all(imagePromises);
        localStorage.setItem("pendingListingImages", JSON.stringify(imageDataUrls));
        
        // Get Stripe checkout URL
        const result = await startCheckout(1);
        
        if (result?.url) {
          console.log("[CreateListing] Redirecting to Stripe:", result.url);
          // Open Stripe in a new tab since iframe navigation is blocked
          window.open(result.url, "_blank");
          toast({
            title: "Checkout Opened",
            description: "Complete your payment in the new tab, then return here.",
          });
          setIsSubmitting(false);
          return;
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (error) {
        console.error("[CreateListing] Checkout error:", error);
        toast({
          title: "Error",
          description: "Failed to start checkout. Please try again.",
          variant: "destructive",
        });
        localStorage.removeItem("pendingListing");
        localStorage.removeItem("pendingListingImages");
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images to storage
      const uploadedImageUrls: string[] = [];
      
      for (const image of images) {
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

      // Create listing in database
      const { data: listingData, error } = await supabase
        .from('listings' as any)
        .insert({
          user_id: user.id,
          year: parseInt(year),
          make: finalMake,
          model: finalModel,
          city,
          state,
          title_status: titleStatus,
          vehicle_type: vehicleType,
          fuel_type: fuelType,
          daily_price: parseInt(dailyPrice),
          weekly_price: weeklyPrice ? parseInt(weeklyPrice) : null,
          monthly_price: monthlyPrice ? parseInt(monthlyPrice) : null,
          description: description || null,
          images: uploadedImageUrls,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Store license plate in separate sensitive data table (only visible to owner/admin)
      if (listingData && licensePlate.trim()) {
        const { error: sensitiveError } = await supabase
          .from('listing_sensitive_data' as any)
          .insert({
            listing_id: (listingData as any).id,
            license_plate: licensePlate.trim().toUpperCase(),
            state: state,
          });

        if (sensitiveError) {
          console.error("Error saving sensitive data:", sensitiveError);
          // Non-blocking - listing was created successfully
        }
      }

      toast({
        title: "Listing Submitted!",
        description: "Your listing will be posted after review.",
      });
      
      navigate("/my-account");
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Create Listing | List Your Car"
        description="List your vehicle for rent"
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
                    Click to upload images (min 5, max 10)
                  </span>
                </label>
              </div>
              
              {imagePreviews.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mt-4">
                    Click on an image to set it as the main photo
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                    {imagePreviews.map((preview, index) => (
                      <div 
                        key={index} 
                        className={`relative aspect-square cursor-pointer group ${
                          index === 0 ? "ring-2 ring-primary ring-offset-2" : ""
                        }`}
                        onClick={() => setMainImage(index)}
                      >
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                            <Star className="h-3 w-3 fill-current" />
                          </div>
                        )}
                        {index !== 0 && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-medium">Set as main</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
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
    </div>
  );
};

export default CreateListing;
