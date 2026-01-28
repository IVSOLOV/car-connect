import { Link, useSearchParams } from "react-router-dom";
import { MapPin, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Listing } from "@/types/listing";

interface ListingCardProps {
  listing: Listing;
  index?: number;
  startDate?: string;
  endDate?: string;
}

const ListingCard = ({ listing, index = 0, startDate, endDate }: ListingCardProps) => {
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

  // Build URL with date params if available
  const listingUrl = startDate && endDate 
    ? `/listing/${listing.id}?startDate=${startDate}&endDate=${endDate}`
    : `/listing/${listing.id}`;

  return (
    <Link to={listingUrl}>
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

          <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center">
              <DollarSign className="mr-1 h-3.5 w-3.5 text-primary" />
              {formatPrice(listing.daily_price)}/day
            </div>
            {listing.weekly_price && (
              <div>{formatPrice(listing.weekly_price)}/wk</div>
            )}
            {listing.monthly_price && (
              <div>{formatPrice(listing.monthly_price)}/mo</div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-2">
              {listing.original_daily_price && listing.original_daily_price > listing.daily_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(listing.original_daily_price)}
                </span>
              )}
              <span className="text-2xl font-bold text-gradient">
                {formatPrice(listing.daily_price)}
                <span className="text-sm font-normal text-muted-foreground">/day</span>
              </span>
            </div>
            <span className="text-xs text-muted-foreground">View Details →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ListingCard;
