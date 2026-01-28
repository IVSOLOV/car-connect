export type VehicleType = "car" | "suv" | "minivan" | "truck" | "van" | "cargo_van" | "box_truck" | "mobility" | "rv" | "trailer";
export type FuelType = "gas" | "diesel" | "hybrid" | "electric" | "other";

export interface Listing {
  id: string;
  user_id: string;
  year: number;
  make: string;
  model: string;
  city: string;
  state: string;
  title_status: string;
  vehicle_type: string;
  fuel_type: string;
  daily_price: number;
  weekly_price: number | null;
  monthly_price: number | null;
  original_daily_price: number | null;
  original_weekly_price: number | null;
  original_monthly_price: number | null;
  description: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
  approval_status: string;
  rejection_reason: string | null;
  deactivation_reason: string | null;
  delivery_available: boolean;
}

// Sensitive listing data stored in separate table with restricted access
export interface ListingSensitiveData {
  id: string;
  listing_id: string;
  license_plate: string | null;
  state: string;
  created_at: string;
  updated_at: string;
}
