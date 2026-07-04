import { createSupabaseOAuthSession } from "../../Server/services/supabaseOAuthSession";

const methodNotAllowed = () =>
  Response.json(
    { success: false, error: "Method not allowed" },
    {
      status: 405,
      headers: { Allow: "POST, OPTIONS" },
    },
  );

export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function POST(request: Request) {
  const result = await createSupabaseOAuthSession(request.headers);
  return Response.json(result.body, { status: result.status });
}
