-- 1. Add column is_creator to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_creator boolean DEFAULT false;

-- 2. Backfill is_creator = true for existing creators
UPDATE public.profiles SET is_creator = true WHERE role = 'creator';

-- 3. Create helper function and trigger to set is_creator automatically
CREATE OR REPLACE FUNCTION public.set_is_creator_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'creator' THEN
    NEW.is_creator := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_is_creator ON public.profiles;

CREATE TRIGGER trg_set_is_creator
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_is_creator_on_profile();
