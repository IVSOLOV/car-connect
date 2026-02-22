import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Gauge,
  Fuel,
  Calendar,
  Settings,
  MessageCircle,
  Share2,
  Heart,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MessageOwnerModal from "@/components/MessageOwnerModal";
import { mockCars } from "@/data/cars";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CarDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const car = mockCars.find((c) => c.id === id);

  if (!car) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Car not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat("en-US").format(mileage);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 pt-36 sm:pt-24 pb-12">
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
                  src={car.images[selectedImage] || car.image}
                  alt={car.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur-sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="bg-background/80 backdrop-blur-sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {car.images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {car.images.map((img, index) => (
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
                  <Badge variant="secondary">{car.brand}</Badge>
                  <Badge variant="outline">{car.fuelType}</Badge>
                </div>
                <h1 className="text-3xl font-bold text-foreground md:text-4xl">
                  {car.title}
                </h1>
                <p className="mt-2 flex items-center text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {car.location}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/50 p-5 md:grid-cols-4">
                <div className="text-center">
                  <Calendar className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-semibold text-foreground">{car.year}</p>
                </div>
                <div className="text-center">
                  <Gauge className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Mileage</p>
                  <p className="font-semibold text-foreground">{formatMileage(car.mileage)} mi</p>
                </div>
                <div className="text-center">
                  <Fuel className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Fuel</p>
                  <p className="font-semibold text-foreground">{car.fuelType}</p>
                </div>
                <div className="text-center">
                  <Settings className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Transmission</p>
                  <p className="font-semibold text-foreground">{car.transmission}</p>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-foreground">Description</h2>
                <p className="leading-relaxed text-muted-foreground">{car.description}</p>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-bold text-foreground">Features</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {car.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center rounded-lg bg-secondary/50 px-4 py-3"
                    >
                      <Check className="mr-3 h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="sticky top-24 space-y-6">
              {/* Price Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-3xl font-bold text-gradient">{formatPrice(car.price)}</p>

                <Separator className="my-5" />

                <Button
                  onClick={() => {
                    if (!user) {
                      toast.error("Please sign in to message the owner");
                      navigate("/auth");
                      return;
                    }
                    setIsMessageModalOpen(true);
                  }}
                  className="w-full mb-3"
                  size="lg"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message Owner
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    if (!user) {
                      toast.error("Please sign in to save listings");
                      navigate("/auth");
                      return;
                    }
                    toast.info("Save functionality coming soon");
                  }}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Save Listing
                </Button>
              </div>

              {/* Owner Card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="mb-4 font-semibold text-foreground">Listed by</h3>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={car.owner.avatar} alt={car.owner.name} />
                    <AvatarFallback>{car.owner.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{car.owner.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Member since {car.owner.memberSince}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MessageOwnerModal
        car={car}
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
      />
      <Footer />
    </div>
  );
};

export default CarDetails;
