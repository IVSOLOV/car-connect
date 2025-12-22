import { Link } from "react-router-dom";
import { MapPin, Gauge, Fuel, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Car } from "@/data/cars";

interface CarCardProps {
  car: Car;
  index?: number;
}

const CarCard = ({ car, index = 0 }: CarCardProps) => {
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
    <Link to={`/car/${car.id}`}>
      <Card
        className="group cursor-pointer overflow-hidden animate-slide-up"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={car.image}
            alt={car.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Badge className="absolute right-3 top-3 bg-primary/90 text-primary-foreground backdrop-blur-sm">
            {car.fuelType}
          </Badge>
        </div>

        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {car.title}
              </h3>
              <p className="mt-1 flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-3.5 w-3.5" />
                {car.location}
              </p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {car.year}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Gauge className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {formatMileage(car.mileage)} mi
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Fuel className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {car.transmission}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-2xl font-bold text-gradient">{formatPrice(car.price)}</span>
            <span className="text-xs text-muted-foreground">View Details →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CarCard;
