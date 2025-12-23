import { Link } from "react-router-dom";
import { MapPin, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Listing } from "@/types/listing";

interface ListingCardProps {
  listing: Listing;
  index?: number;
}

const ListingCard = ({ listing, index = 0 }: ListingCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const location = `${listing.city}, ${listing.state}`;
  const image = listing.images?.[0] || "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80";

  return (
    <Link to={`/listing/${listing.id}`}>
      <Card
        className="group cursor-pointer overflow-hidden animate-slide-up"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Badge className="absolute right-3 top-3 bg-primary/90 text-primary-foreground backdrop-blur-sm">
            {listing.title_status === "clear" ? "Clear Title" : "Rebuild"}
          </Badge>
        </div>

        <CardContent className="p-5">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="mt-1 flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-3.5 w-3.5" />
              {location}
            </p>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {listing.year}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <DollarSign className="mr-1.5 h-3.5 w-3.5 text-primary" />
              {formatPrice(listing.daily_price)}/day
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-2xl font-bold text-gradient">{formatPrice(listing.daily_price)}<span className="text-sm font-normal text-muted-foreground">/day</span></span>
            <span className="text-xs text-muted-foreground">View Details →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ListingCard;
