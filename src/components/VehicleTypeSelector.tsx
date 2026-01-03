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
  const iconClass = cn("w-6 h-6", className);
  
  switch (type) {
    case "sedan":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M2 15h20M4 15v-2c0-.5.2-1 .5-1.2L7 10l2-3h6l2.5 3 2.5 1.8c.3.2.5.7.5 1.2v2" />
          <path d="M9 10h6" />
          <circle cx="6" cy="15" r="2" fill="currentColor" />
          <circle cx="18" cy="15" r="2" fill="currentColor" />
        </svg>
      );
    case "suv":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M4 17h16M6 17v-5h12v5M6 12l2-5h8l2 5" />
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
        </svg>
      );
    case "minivan":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M4 17h16M6 17v-6l3-4h9v10" />
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
          <path d="M11 11h4v3h-4z" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M3 17h18M5 17v-4l2-3h4v7M11 10h8v7" />
          <circle cx="6.5" cy="17" r="1.5" />
          <circle cx="17.5" cy="17" r="1.5" />
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
          <path d="M2 15h20M4 15v-2c0-.5.2-1 .5-1.2L7 10l2-3h6l2.5 3 2.5 1.8c.3.2.5.7.5 1.2v2" />
          <path d="M9 10h6" />
          <circle cx="6" cy="15" r="2" fill="currentColor" />
          <circle cx="18" cy="15" r="2" fill="currentColor" />
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
