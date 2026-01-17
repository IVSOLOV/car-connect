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
  { value: "mobility", label: "Mobility Vehicle", icon: "mobility" },
  { value: "rv", label: "RV", icon: "rv" },
  { value: "trailer", label: "Trailer", icon: "trailer" },
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number]["value"];

// Side-view vehicle icons
const VehicleIcon = ({ type, className }: { type: string; className?: string }) => {
  const iconClass = cn("w-10 h-10", className);
  
  switch (type) {
    case "sedan":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Car body */}
          <path d="M4 14 L4 11 L7 11 L10 6 L18 4 L30 4 L36 6 L42 8 L44 11 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Windows */}
          <path d="M11 6.5 L17.5 5 L17.5 10 L8 10 L11 6.5Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M19 5 L29.5 5 L34 7 L34 10 L19 10 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "suv":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* SUV body - taller with sloped back */}
          <path d="M4 14 L4 10 L6 10 L9 4 L20 3 L32 3 L38 5 L42 7 L44 10 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Windows */}
          <path d="M10 5 L19 4 L19 9 L7 9 L10 5Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M21 4 L31 4 L36 6 L36 9 L21 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "minivan":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Minivan body - long with sliding door windows */}
          <path d="M4 14 L4 10 L5 6 L10 3 L40 3 L44 6 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Windows */}
          <path d="M7 7 L10 4 L16 4 L16 9 L6 9 L7 7Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M18 4 L26 4 L26 9 L18 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M28 4 L36 4 L36 9 L28 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Pickup truck - cab with open bed */}
          <path d="M4 14 L4 10 L6 10 L9 5 L20 4 L20 6 L44 6 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Cab windows */}
          <path d="M10 6 L19 5 L19 9 L7 9 L10 6Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Truck bed */}
          <path d="M22 7 L42 7 L42 10 L22 10 Z" fill="currentColor" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "van":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Commercial van - tall boxy */}
          <path d="M4 14 L4 4 L8 2 L40 2 L44 4 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Windows */}
          <path d="M5 5 L8 3 L14 3 L14 9 L5 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M16 3 L22 3 L22 9 L16 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "cargo_van":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Cargo van - tall with no rear windows */}
          <path d="M4 14 L4 4 L8 2 L40 2 L44 4 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Front windows only */}
          <path d="M5 5 L8 3 L14 3 L14 9 L5 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Cargo door line */}
          <path d="M28 3 L28 10" stroke="hsl(var(--background))" strokeWidth="0.5" fill="none" opacity="0.3" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "box_truck":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Box truck - cab and separate box */}
          <path d="M4 14 L4 8 L6 8 L9 4 L18 4 L18 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          <path d="M20 2 L44 2 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L20 14 Z" />
          {/* Cab window */}
          <path d="M10 5 L17 5 L17 9 L7 9 L10 5Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "mobility":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Mobility van - lowered floor, wheelchair accessible */}
          <path d="M4 14 L4 6 L8 3 L40 3 L44 6 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          {/* Windows */}
          <path d="M5 7 L8 4 L14 4 L14 9 L5 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M16 4 L24 4 L24 9 L16 9 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Side door / ramp area */}
          <path d="M26 4 L34 4 L34 11 L26 11 Z" fill="hsl(var(--background))" opacity="0.3" />
          {/* Wheelchair symbol */}
          <circle cx="30" cy="6" r="1" fill="hsl(var(--primary))" />
          <path d="M29.5 7.5 L29.5 9 L31 9" stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" />
          <circle cx="30.5" cy="9.5" r="1" stroke="hsl(var(--primary))" strokeWidth="0.5" fill="none" />
          {/* Front wheel */}
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "rv":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* RV / Motorhome - long with cab and living area */}
          <path d="M2 14 L2 8 L4 8 L7 4 L14 4 L14 2 L44 2 L46 4 L46 14 L42 14 C42 11.8 40.2 10 38 10 C35.8 10 34 11.8 34 14 L14 14 C14 11.8 12.2 10 10 10 C7.8 10 6 11.8 6 14 Z" />
          {/* Cab window */}
          <path d="M8 5 L13 5 L13 9 L5 9 L8 5Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Living area windows */}
          <path d="M18 3 L24 3 L24 8 L18 8 Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M26 3 L32 3 L32 8 L26 8 Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M34 3 L40 3 L40 8 L34 8 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Door */}
          <path d="M42 4 L44 4 L44 10 L42 10 Z" fill="hsl(var(--background))" opacity="0.3" />
          {/* Front wheel */}
          <circle cx="10" cy="14" r="3.5" />
          <circle cx="10" cy="14" r="1.5" fill="hsl(var(--background))" />
          {/* Rear wheel */}
          <circle cx="38" cy="14" r="3.5" />
          <circle cx="38" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    case "trailer":
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          {/* Travel trailer with hitch */}
          {/* Hitch */}
          <path d="M2 10 L8 10 L8 12 L2 12 Z" />
          {/* Trailer body */}
          <path d="M8 14 L8 4 L44 4 L46 6 L46 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 Z" />
          {/* Windows */}
          <path d="M12 5 L20 5 L20 10 L12 10 Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M22 5 L30 5 L30 10 L22 10 Z" fill="hsl(var(--background))" opacity="0.5" />
          {/* Door */}
          <path d="M38 5 L42 5 L42 11 L38 11 Z" fill="hsl(var(--background))" opacity="0.3" />
          {/* Wheel */}
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 20" fill="currentColor" className={iconClass}>
          <path d="M4 14 L4 11 L7 11 L10 6 L18 4 L30 4 L36 6 L42 8 L44 11 L44 14 L40 14 C40 11.8 38.2 10 36 10 C33.8 10 32 11.8 32 14 L16 14 C16 11.8 14.2 10 12 10 C9.8 10 8 11.8 8 14 Z" />
          <path d="M11 6.5 L17.5 5 L17.5 10 L8 10 L11 6.5Z" fill="hsl(var(--background))" opacity="0.5" />
          <path d="M19 5 L29.5 5 L34 7 L34 10 L19 10 Z" fill="hsl(var(--background))" opacity="0.5" />
          <circle cx="12" cy="14" r="3.5" />
          <circle cx="12" cy="14" r="1.5" fill="hsl(var(--background))" />
          <circle cx="36" cy="14" r="3.5" />
          <circle cx="36" cy="14" r="1.5" fill="hsl(var(--background))" />
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
          "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium min-w-[70px] justify-center",
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
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-medium min-w-[70px] justify-center",
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
