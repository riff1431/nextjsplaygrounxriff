ALTER TABLE public.admin_bar_config 
ADD COLUMN IF NOT EXISTS custom_requests jsonb DEFAULT '["Show me boobs", "Do something spicy", "Change outfit", "Dance for me", "Say my name"]'::jsonb;
