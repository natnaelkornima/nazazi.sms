-- =========================================================================
-- SUPABASE MIGRATION: 20260101000000_initial_schema.sql
-- Table: public.registrations
-- Description: Stores subscriber registration records and payment receipts
-- =========================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    payment_image_url TEXT NOT NULL,
    plan_name TEXT DEFAULT 'Standard Plan (200 Birr)',
    amount NUMERIC DEFAULT 200,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    reviewed_at TIMESTAMPTZ
);

-- 2. Enable Row Level Security
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public user insertion
-- Allows any unauthenticated public visitor to submit their subscription registration
DROP POLICY IF EXISTS "Allow public insert for registrations" ON public.registrations;
CREATE POLICY "Allow public insert for registrations"
ON public.registrations
FOR INSERT
TO public
WITH CHECK (
    char_length(name) >= 2 AND
    char_length(phone_number) >= 8 AND
    char_length(payment_image_url) >= 5
);

-- 4. Policy: Service role full privileges
-- Trusted backend API routes using SUPABASE_SERVICE_ROLE_KEY manage full CRUD
DROP POLICY IF EXISTS "Allow service role full access" ON public.registrations;
CREATE POLICY "Allow service role full access"
ON public.registrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Indexes for fast query lookups and search
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON public.registrations (phone_number);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations (status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations (created_at DESC);
