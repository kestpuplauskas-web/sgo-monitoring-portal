import { createFileRoute } from "@tanstack/react-router";
import { createPublicClient } from "@/lib/public-db.server";

export const Route = createFileRoute("/api/public/plans")({
  server: {
    handlers: {
      GET: async () => {
        const db = createPublicClient();
        const { data, error } = await db
          .from("plans")
          .select("id,slug,name,price,old_price,period_label,tagline,features,benefit,promo,activation_fee,recommended,sort_order")
          .eq("active", true)
          .order("sort_order");
        if (error) return Response.json({ error: "Nepavyko gauti planų" }, { status: 500 });
        return Response.json(
          { plans: data },
          { headers: { "cache-control": "public, max-age=60" } },
        );
      },
    },
  },
});
