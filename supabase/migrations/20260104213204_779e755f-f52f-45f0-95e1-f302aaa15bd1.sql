-- Fix the booking overlap check - use '[)' for half-open intervals
-- This means start_date is included but end_date is excluded from the range
-- So a booking ending on Jan 29 won't conflict with one starting Jan 30
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM listing_bookings
    WHERE listing_id = NEW.listing_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND daterange(start_date, end_date + 1, '[)') && daterange(NEW.start_date, NEW.end_date + 1, '[)')
  ) THEN
    RAISE EXCEPTION 'Booking dates overlap with existing booking';
  END IF;
  RETURN NEW;
END;
$function$;