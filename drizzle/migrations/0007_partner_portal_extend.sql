ALTER TABLE public.partner_clients
  ADD COLUMN address text NOT NULL DEFAULT '',
  ADD COLUMN serial_no text NOT NULL DEFAULT '',
  ADD COLUMN logger_id text NOT NULL DEFAULT '',
  ADD COLUMN installed_on date,
  ADD COLUMN warranty_until date,
  ADD COLUMN status text NOT NULL DEFAULT 'pateikta';

CREATE TABLE public.partner_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.partner_clients(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'gedimas',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'nauja',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_service_requests TO authenticated;
GRANT ALL ON public.partner_service_requests TO service_role;
ALTER TABLE public.partner_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active partner own requests read" ON public.partner_service_requests FOR SELECT TO authenticated USING (partner_id = public.my_active_partner_id());
CREATE POLICY "Active partner own requests insert" ON public.partner_service_requests FOR INSERT TO authenticated WITH CHECK (partner_id = public.my_active_partner_id() AND status = 'nauja');
CREATE POLICY "Staff manage service requests" ON public.partner_service_requests FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role]));