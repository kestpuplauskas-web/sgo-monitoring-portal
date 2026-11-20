export type AppRole = "admin" | "manager" | "editor";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administratorius",
  manager: "Vadybininkas",
  editor: "Redaktorius",
};

export const ROLE_HINTS: Record<AppRole, string> = {
  admin: "Mato ir valdo viską, kviečia vartotojus.",
  manager: "Užsakymai, klientai, analitika ir kainodara.",
  editor: "Tik straipsniai.",
};

export type Section = "orders" | "chat" | "inquiries" | "clients" | "analytics" | "pricing" | "articles" | "users";

const ACCESS: Record<Section, AppRole[]> = {
  orders: ["admin", "manager"],
  chat: ["admin", "manager"],
  inquiries: ["admin", "manager"],
  clients: ["admin", "manager"],
  analytics: ["admin", "manager"],
  pricing: ["admin", "manager"],
  articles: ["admin", "editor"],
  users: ["admin"],
};

export function canAccess(roles: AppRole[], section: Section): boolean {
  return roles.some((r) => ACCESS[section].includes(r));
}

export const ORDER_STATUSES = [
  { value: "nauja", label: "Nauja" },
  { value: "susisiekta", label: "Susisiekta" },
  { value: "aktyvuota", label: "Aktyvuota" },
  { value: "atsaukta", label: "Atšaukta" },
] as const;
