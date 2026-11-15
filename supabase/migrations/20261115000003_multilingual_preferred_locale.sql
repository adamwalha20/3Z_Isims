-- ==============================================================================
-- ZEC Campus Hub — Multilingual Support & User Preferred Locale Migration
-- ==============================================================================

-- 1. Add preferred_locale column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'en'
CHECK (preferred_locale IN ('en', 'fr', 'ar-TN'));

-- 2. Index for locale lookups (e.g. For localized batch notification dispatching)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_locale ON public.profiles(preferred_locale);

-- 3. Update existing profiles to ensure default 'en'
UPDATE public.profiles
SET preferred_locale = 'en'
WHERE preferred_locale IS NULL;
