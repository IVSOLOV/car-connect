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
}
