-- Add missing columns for rejection functionality
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejected BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
