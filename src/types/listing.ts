export interface Listing {
  id: string;
  user_id: string;
  year: number;
  make: string;
  model: string;
  city: string;
  state: string;
  title_status: string;
  daily_price: number;
  monthly_price: number | null;
  original_daily_price: number | null;
  description: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
  approval_status: string;
  rejection_reason: string | null;
  deactivation_reason: string | null;
}
