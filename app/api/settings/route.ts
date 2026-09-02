import { createClient, isSupabaseConfigured } from "../../../lib/supabase/server";

const jsonHeaders = { "Content-Type": "application/json" };

async function requireAdmin() {
  if (!isSupabaseConfigured()) return { supabase: null, isAdmin: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, isAdmin: profile?.role === "admin" };
}

export async function PATCH(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin || !supabase) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  try {
    const body = await request.json() as { home_course_ids?: unknown };
    const homeCourseIds = Array.isArray(body.home_course_ids)
      ? body.home_course_ids.filter((id): id is string => typeof id === "string")
      : [];

    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, home_course_ids: homeCourseIds, updated_at: new Date().toISOString() });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, home_course_ids: homeCourseIds }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    console.error("Failed to update site settings", err);
    return new Response(JSON.stringify({ error: "Unable to save settings" }), { status: 500, headers: jsonHeaders });
  }
}
