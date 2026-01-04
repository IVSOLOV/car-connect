-- Fix the booking overlap check - allow same-day turnovers
-- A booking ending on a date should not block a booking starting on that same date
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
    AND NEW.start_date < end_date
    AND NEW.end_date > start_date
  ) THEN
    RAISE EXCEPTION 'Booking dates overlap with existing booking';
  END IF;
  RETURN NEW;
END;
$function$;