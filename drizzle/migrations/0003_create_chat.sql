CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  status text NOT NULL DEFAULT 'agent',
  visitor_name text NOT NULL DEFAULT '',
  visitor_email text NOT NULL DEFAULT '',
  page text NOT NULL DEFAULT '',
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.chat_messages(session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all sessions" ON public.chat_sessions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
CREATE POLICY "staff all messages" ON public.chat_messages FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;