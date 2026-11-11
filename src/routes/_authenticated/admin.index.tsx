import { createFileRoute, Navigate } from "@tanstack/react-router";
import { canAccess } from "@/lib/admin-roles";
import { useMyRoles } from "@/lib/use-my-roles";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const me = useMyRoles();
  if (!me.data) return null;
  if (canAccess(me.data.roles, "orders")) return <Navigate to="/admin/uzsakymai" replace />;
  return <Navigate to="/admin/straipsniai" replace />;
}
