CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  company text NOT NULL DEFAULT '',
  company_code text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'laukiama',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.partner_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  power text NOT NULL DEFAULT '',
  inverter text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_clients TO authenticated;
GRANT ALL ON public.partner_clients TO service_role;
ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_active_partner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid() AND status = 'aktyvus' LIMIT 1
$$;

CREATE POLICY "Staff manage partners" ON public.partners FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Partner reads own" ON public.partners FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Staff manage partner clients" ON public.partner_clients FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "Active partner manages own clients" ON public.partner_clients FOR ALL TO authenticated
  USING (partner_id = public.my_active_partner_id())
  WITH CHECK (partner_id = public.my_active_partner_id());

CREATE OR REPLACE FUNCTION public.handle_partner_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  IF m->>'signup_as' = 'partner' THEN
    INSERT INTO public.partners (user_id, email, company, company_code, contact_name, phone, city, status)
    VALUES (NEW.id, COALESCE(NEW.email,''), left(COALESCE(m->>'company',''),200), left(COALESCE(m->>'company_code',''),50),
      left(COALESCE(m->>'full_name',''),100), left(COALESCE(m->>'phone',''),30), left(COALESCE(m->>'city',''),100), 'laukiama')
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'partner');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_partner_signup AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_partner_signup();