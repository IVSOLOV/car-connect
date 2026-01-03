import { Car, CarFront, Truck, Bus, Container, Package, Warehouse, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export const VEHICLE_TYPES = [
  { value: "car", label: "Car", icon: "car" },
  { value: "suv", label: "SUV", icon: "suv" },
  { value: "minivan", label: "Minivan", icon: "minivan" },
  { value: "truck", label: "Truck", icon: "truck" },
  { value: "van", label: "Van", icon: "van" },
  { value: "cargo_van", label: "Cargo Van", icon: "cargo_van" },
  { value: "box_truck", label: "Box Truck", icon: "box_truck" },
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number]["value"];

// Using Lucide icons for clarity
const VehicleIcon = ({ type, className }: { type: string; className?: string }) => {
  const iconClass = cn("w-5 h-5", className);
  
  switch (type) {
    case "car":
      return <CarFront className={iconClass} />;
    case "suv":
      return <Car className={iconClass} />;
    case "minivan":
      return <Bus className={iconClass} />;
    case "truck":
      return <Truck className={iconClass} />;
    case "van":
      return <Bus className={iconClass} />;
    case "cargo_van":
      return <Container className={iconClass} />;
    case "box_truck":
      return <Package className={iconClass} />;
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
  return VEHICLE_TYPES.find((t) => t.value === value)?.label || "Car";
};
