import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const VEHICLE_TYPES = [
  { value: "car", label: "Sedan", icon: "sedan" },
  { value: "suv", label: "SUV", icon: "suv" },
  { value: "minivan", label: "Minivan", icon: "minivan" },
  { value: "truck", label: "Truck", icon: "truck" },
  { value: "van", label: "Van", icon: "van" },
  { value: "cargo_van", label: "Cargo Van", icon: "cargo_van" },
  { value: "box_truck", label: "Box Truck", icon: "box_truck" },
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number]["value"];

// Side-view vehicle icons
const VehicleIcon = ({ type, className }: { type: string; className?: string }) => {
  const iconClass = cn("w-8 h-8", className);
  
  switch (type) {
    case "sedan":
      return (
        <svg viewBox="0 0 32 16" fill="currentColor" className={iconClass}>
          <path d="M29 10v2c0 .5-.4 1-1 1h-1.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H10.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H4c-.6 0-1-.5-1-1v-2l1-2 3-4h10l4 2 6 2 2 2z" />
          <path d="M7 7h5l-1 3H6.5L7 7zM13 7h6l2 3h-8V7z" fill="hsl(var(--background))" opacity="0.4" />
          <circle cx="8" cy="13" r="2" />
          <circle cx="8" cy="13" r="1" fill="hsl(var(--background))" />
          <circle cx="24" cy="13" r="2" />
          <circle cx="24" cy="13" r="1" fill="hsl(var(--background))" />
        </svg>
      );
    case "suv":
      return (
        <svg viewBox="0 0 32 16" fill="currentColor" className={iconClass}>
          <path d="M29 11v1.5c0 .5-.4 1-1 1h-1.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H10.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H4c-.6 0-1-.5-1-1V11l1-1.5V7c0-.5.3-1 .7-1.2L8 4h8l6 2h4l2 3v2z" />
          <path d="M6 5.5L8.5 5h6l-1 4H5.5l.5-3.5zM15 5h5l3 4h-9L15 5z" fill="hsl(var(--background))" opacity="0.4" />
          <circle cx="8" cy="13.5" r="2" />
          <circle cx="8" cy="13.5" r="1" fill="hsl(var(--background))" />
          <circle cx="24" cy="13.5" r="2" />
          <circle cx="24" cy="13.5" r="1" fill="hsl(var(--background))" />
        </svg>
      );
    case "minivan":
      return (
        <svg viewBox="0 0 32 16" fill="currentColor" className={iconClass}>
          <path d="M29 11v1.5c0 .5-.4 1-1 1h-1.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H10.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H4c-.6 0-1-.5-1-1V11l.5-1V6.5L6 4h20l2 2.5V10l1 1z" />
          <path d="M5 5l2-1h4l-.5 5H4.5L5 5zM11.5 4h5v5h-5V4zM17 4h5v5h-5V4zM22.5 4H26l1.5 2v3h-5V4z" fill="hsl(var(--background))" opacity="0.4" />
          <circle cx="8" cy="13.5" r="2" />
          <circle cx="8" cy="13.5" r="1" fill="hsl(var(--background))" />
          <circle cx="24" cy="13.5" r="2" />
          <circle cx="24" cy="13.5" r="1" fill="hsl(var(--background))" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 32 16" fill="currentColor" className={iconClass}>
          <path d="M29 11v1.5c0 .5-.4 1-1 1h-1.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H10.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H4c-.6 0-1-.5-1-1V11l1-1V7l2-3h8l2 2h10l1 1v4z" />
          <path d="M5 5l2-1h6l2 2v3H4.5L5 5zM15.5 6H27v3H15.5V6z" fill="hsl(var(--background))" opacity="0.4" />
          <path d="M15 6h12v4H15V6z" fill="currentColor" />
          <circle cx="8" cy="13.5" r="2" />
          <circle cx="8" cy="13.5" r="1" fill="hsl(var(--background))" />
          <circle cx="24" cy="13.5" r="2" />
          <circle cx="24" cy="13.5" r="1" fill="hsl(var(--background))" />
        </svg>
      );
    case "van":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M4 17h16M6 17v-7h12v7" />
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
          <path d="M8 13h3v2H8z" />
        </svg>
      );
    case "cargo_van":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M4 17h16M6 17v-7h12v7" />
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
          <path d="M8 13h2v2H8zM12 10v7" />
        </svg>
      );
    case "box_truck":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M3 17h18M5 17v-4l2-3h3v7M10 10h10v7" />
          <circle cx="6.5" cy="17" r="1.5" />
          <circle cx="17.5" cy="17" r="1.5" />
          <path d="M12 12h6v3h-6z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 16" fill="currentColor" className={iconClass}>
          <path d="M29 10v2c0 .5-.4 1-1 1h-1.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H10.5c-.3-1.2-1.4-2-2.5-2s-2.2.8-2.5 2H4c-.6 0-1-.5-1-1v-2l1-2 3-4h10l4 2 6 2 2 2z" />
          <path d="M7 7h5l-1 3H6.5L7 7zM13 7h6l2 3h-8V7z" fill="hsl(var(--background))" opacity="0.4" />
          <circle cx="8" cy="13" r="2" />
          <circle cx="8" cy="13" r="1" fill="hsl(var(--background))" />
          <circle cx="24" cy="13" r="2" />
          <circle cx="24" cy="13" r="1" fill="hsl(var(--background))" />
        </svg>
      );
  }
};

interface VehicleTypeSelectorProps {
  value: VehicleType;
  onChange: (value: VehicleType) => void;
  disabled?: boolean;
}

export const VehicleTypeSelector = ({ value, onChange, disabled }: VehicleTypeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {VEHICLE_TYPES.map((type) => {
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type.value)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left",
              "hover:border-primary/50 hover:bg-accent/50",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-card",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-5 h-5 rounded border-2 transition-colors flex-shrink-0",
              isSelected 
                ? "bg-primary border-primary" 
                : "border-muted-foreground/40"
            )}>
              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <VehicleIcon type={type.icon} className={cn(
              "flex-shrink-0",
              isSelected ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-sm font-medium",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Compact version for filters
interface VehicleTypeFilterProps {
  value: VehicleType | "";
  onChange: (value: VehicleType | "") => void;
}

export const VehicleTypeFilter = ({ value, onChange }: VehicleTypeFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium",
          "hover:border-primary/50 hover:bg-accent/50",
          value === ""
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground"
        )}
      >
        All Types
      </button>
      {VEHICLE_TYPES.map((type) => {
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-medium",
              "hover:border-primary/50 hover:bg-accent/50",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            <VehicleIcon type={type.icon} className="w-4 h-4" />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const getVehicleTypeLabel = (value: VehicleType): string => {
  return VEHICLE_TYPES.find((t) => t.value === value)?.label || "Sedan";
};
