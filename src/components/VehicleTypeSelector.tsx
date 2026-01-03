import { Car, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export const VEHICLE_TYPES = [
  { value: "car", label: "Cars", icon: "car" },
  { value: "suv", label: "SUVs", icon: "suv" },
  { value: "minivan", label: "Minivans", icon: "minivan" },
  { value: "truck", label: "Trucks", icon: "truck" },
  { value: "van", label: "Vans", icon: "van" },
  { value: "cargo_van", label: "Cargo vans", icon: "cargo_van" },
  { value: "box_truck", label: "Box trucks", icon: "box_truck" },
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number]["value"];

// Custom SVG icons for vehicle types
const VehicleIcon = ({ type, className }: { type: string; className?: string }) => {
  const iconClass = cn("w-full h-full", className);
  
  switch (type) {
    case "car":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M8 24h48M12 24v-6a2 2 0 0 1 2-2h8l4-8h12l4 8h8a2 2 0 0 1 2 2v6" />
          <circle cx="18" cy="24" r="4" />
          <circle cx="46" cy="24" r="4" />
          <path d="M24 16h16" />
        </svg>
      );
    case "suv":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M6 24h52M10 24v-8a2 2 0 0 1 2-2h6l3-6h22l3 6h6a2 2 0 0 1 2 2v8" />
          <circle cx="16" cy="24" r="4" />
          <circle cx="48" cy="24" r="4" />
          <path d="M21 14v-4h22v4" />
          <path d="M32 8v6" />
        </svg>
      );
    case "minivan":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M6 24h52M10 24v-10a2 2 0 0 1 2-2h8l6-6h20a2 2 0 0 1 2 2v16" />
          <circle cx="16" cy="24" r="4" />
          <circle cx="48" cy="24" r="4" />
          <path d="M26 12h10v6H26z" />
          <path d="M38 12h8v6h-8z" />
        </svg>
      );
    case "truck":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M4 24h56M8 24v-10a2 2 0 0 1 2-2h10l4-6h8v18M32 6h22a2 2 0 0 1 2 2v16" />
          <circle cx="14" cy="24" r="4" />
          <circle cx="50" cy="24" r="4" />
          <path d="M32 24v-18" />
        </svg>
      );
    case "van":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M6 24h52M10 24V10a2 2 0 0 1 2-2h34a2 2 0 0 1 2 2v14" />
          <circle cx="16" cy="24" r="4" />
          <circle cx="48" cy="24" r="4" />
          <path d="M14 12h8v6h-8z" />
          <path d="M26 12h12v6H26z" />
        </svg>
      );
    case "cargo_van":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M6 24h52M10 24V10a2 2 0 0 1 2-2h36a2 2 0 0 1 2 2v14" />
          <circle cx="16" cy="24" r="4" />
          <circle cx="48" cy="24" r="4" />
          <path d="M14 12h8v6h-8z" />
          <path d="M28 10v14" />
          <path d="M42 14v6" />
        </svg>
      );
    case "box_truck":
      return (
        <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={iconClass}>
          <path d="M4 24h56" />
          <path d="M8 24v-12a2 2 0 0 1 2-2h12l4-4h6v18" />
          <path d="M32 6h24a2 2 0 0 1 2 2v16" />
          <circle cx="14" cy="24" r="4" />
          <circle cx="50" cy="24" r="4" />
          <path d="M32 6v18" />
          <path d="M36 10h16v10H36z" />
        </svg>
      );
    default:
      return <Car className={iconClass} />;
  }
};

interface VehicleTypeSelectorProps {
  value: VehicleType;
  onChange: (value: VehicleType) => void;
  disabled?: boolean;
}

export const VehicleTypeSelector = ({ value, onChange, disabled }: VehicleTypeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {VEHICLE_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(type.value)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
            "hover:border-primary/50 hover:bg-accent/50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            value === type.value
              ? "border-primary bg-primary/5"
              : "border-border bg-card",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="w-16 h-8 text-foreground">
            <VehicleIcon type={type.icon} />
          </div>
          <span className="text-sm font-medium text-foreground">{type.label}</span>
        </button>
      ))}
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
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-xs",
          "hover:border-primary/50 hover:bg-accent/50",
          value === ""
            ? "border-primary bg-primary/5"
            : "border-border bg-card"
        )}
      >
        <span className="font-medium">All</span>
      </button>
      {VEHICLE_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
            "hover:border-primary/50 hover:bg-accent/50",
            value === type.value
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          )}
        >
          <div className="w-10 h-5 text-foreground">
            <VehicleIcon type={type.icon} />
          </div>
          <span className="text-[10px] font-medium text-foreground">{type.label}</span>
        </button>
      ))}
    </div>
  );
};

export const getVehicleTypeLabel = (value: VehicleType): string => {
  return VEHICLE_TYPES.find((t) => t.value === value)?.label || "Car";
};
