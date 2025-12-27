-- Enable REPLICA IDENTITY FULL for proper realtime updates on listings table
ALTER TABLE public.listings REPLICA IDENTITY FULL;