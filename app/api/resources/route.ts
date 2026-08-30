import { createClient, isSupabaseConfigured } from "../../../lib/supabase/server";
import { generateReferralCode } from "../../../lib/referrals";

const jsonHeaders = { "Content-Type": "application/json" };

async function requireAdmin() {
  if (!isSupabaseConfigured()) return { supabase: null, user: null, isAdmin: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function POST(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin || !supabase) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  try {
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const content = String(form.get("content") || "").trim();
    const url = String(form.get("url") || "").trim();
    const file = form.get("file");

    const hasPdf = file instanceof File && file.size > 0;
    if (!title || !description || (!content && !url && !hasPdf)) {
      return new Response(JSON.stringify({ error: "Invalid fields" }), { status: 400, headers: jsonHeaders });
    }

    const baseSlug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "resource";
    const { data: slugMatch } = await supabase.from("resources").select("id").eq("slug", baseSlug).maybeSingle();
    const slug = slugMatch ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;
    const referralCode = await generateReferralCode();
    let pdfUrl: string | null = null;
    if (hasPdf) {
      if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "A PDF under 10 MB is required" }), { status: 400, headers: jsonHeaders });
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("resources").upload(path, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      pdfUrl = supabase.storage.from("resources").getPublicUrl(path).data.publicUrl;
    }

    const { data: inserted, error } = await supabase
      .from("resources")
      .insert({ slug, title, description, type: "bundle", content: content || null, pdf_url: pdfUrl, article_url: url || null, file_url: null, referral_code: referralCode, is_published: true })
      .select()
      .single();
    if (error) throw error;

    const shareUrl = new URL(`/res/${encodeURIComponent(slug)}`, request.url);
    shareUrl.searchParams.set("ref", referralCode);
    return new Response(JSON.stringify({ resource: inserted, shareUrl: shareUrl.toString() }), { status: 201, headers: jsonHeaders });
  } catch {
    console.error("Resource publication failed");
    return new Response(JSON.stringify({ error: "Unable to publish resource" }), { status: 500, headers: jsonHeaders });
  }
}

export async function DELETE(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin || !supabase) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: jsonHeaders });

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return new Response(JSON.stringify({ error: "Unable to delete resource" }), { status: 500, headers: jsonHeaders });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
}
