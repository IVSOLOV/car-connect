import { LucideIcon, Car, Heart, Search, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateVariant = "listings" | "saved" | "search" | "messages" | "custom";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const variantConfig: Record<EmptyStateVariant, { icon: LucideIcon; title: string; description: string }> = {
  listings: {
    icon: Car,
    title: "No listings yet",
    description: "Be the first to list your car and start earning!",
  },
  saved: {
    icon: Heart,
    title: "No saved listings",
    description: "Browse cars and save your favorites for later.",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your filters or search terms.",
  },
  messages: {
    icon: MessageSquare,
    title: "No messages yet",
    description: "Start a conversation with a car owner.",
  },
  custom: {
    icon: FileText,
    title: "Nothing here",
    description: "There's no content to display.",
  },
};

const EmptyState = ({
  variant = "custom",
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const config = variantConfig[variant];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      {/* Icon with decorative background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted border border-border">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>

      {/* Text content */}
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {displayTitle}
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        {displayDescription}
      </p>

      {/* Action button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
