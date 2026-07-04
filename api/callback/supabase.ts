import { createSupabaseOAuthSession } from "../../Server/services/supabaseOAuthSession";

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    if (request.method !== "POST") {
      return Response.json(
        { success: false, error: "Method not allowed" },
        {
          status: 405,
          headers: { Allow: "POST, OPTIONS" },
        },
      );
    }

    const result = await createSupabaseOAuthSession(request.headers);
    return Response.json(result.body, { status: result.status });
  },
};
