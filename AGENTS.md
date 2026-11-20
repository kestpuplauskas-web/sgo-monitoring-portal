<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- The sgo.lt public website is the original static HTML/CSS/JS kept in public/; routes /, /monitoringas, /diagnostika, /servisas only serve those files, so edit the HTML in public/ to change the site.
- The admin panel lives under src/routes/_authenticated/admin.* (client-only, gated to /admin/prisijungimas); section access per role is defined once in src/lib/admin-roles.ts so menu and pages stay consistent.
- The static site talks to the backend only through /api/public/plans, /api/public/orders and /api/public/track, so plan prices, orders and analytics stay in the database while the HTML stays static.
- Roles live in public.user_roles (admin/manager/editor) enforced by RLS via has_any_role; the first account ever created becomes admin automatically.
- Classify password-update errors in a browser-safe helper so weak-password rejections never masquerade as expired invitations; preserve hosted password security checks.
- Admin navigation uses the same role-filtered links in the desktop sidebar and mobile drawer; mobile order/client cards share the existing queries and dialogs to avoid behavioral divergence.
- Mount the static site's plan-order modal directly under body so section stacking contexts cannot place navigation above its controls.
- Site chat (public/chat-widget.js) talks only to /api/public/chat with a per-session secret token; staff read/reply via RLS-protected chat_sessions/chat_messages with realtime, so visitors never touch tables directly.
- Partners (contractors) live in public.partners + public.partner_clients; self-signup at /partner sets signup_as=partner metadata and an auth.users trigger creates a 'laukiama' partner + partner role, so only staff-approved ('aktyvus') partners can manage clients via RLS (my_active_partner_id).
- Server-sent emails link to https://sgo.lt, never the request origin, so links never point at preview/localhost hosts.
