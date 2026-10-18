import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function verifyAdminRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<boolean> {
  const secret = req.headers.get("x-admin-secret");
  if (!secret) {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (auth && serviceKey && auth === serviceKey) {
      return true;
    }
    return false;
  }

  const { data, error } = await supabase.rpc("validate_admin_secret", {
    candidate_secret: secret,
  });

  if (error || !data) {
    return false;
  }
  return true;
}
