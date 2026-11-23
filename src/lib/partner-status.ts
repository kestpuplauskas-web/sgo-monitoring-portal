export const CLIENT_STATUSES = [
  { value: "pateikta", label: "Pateikta SGO" },
  { value: "derinama", label: "Sutartis derinama" },
  { value: "aktyvi", label: "Aktyvi stebėsena" },
  { value: "ispejimas", label: "Pastebėta klaida" },
] as const;
export const clientStatusLabel = (v: string) => CLIENT_STATUSES.find((s) => s.value === v)?.label ?? v;
export const REQUEST_STATUSES: Record<string, string> = { nauja: "Nauja", vykdoma: "Vykdoma", atlikta: "Atlikta" };
