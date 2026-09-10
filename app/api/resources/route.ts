import { createClient, isSupabaseConfigured } from "../../../lib/supabase/server";
import { generateReferralCode } from "../../../lib/referrals";
import type { ResourceBlock } from "../../data";

const jsonHeaders = { "Content-Type": "application/json" };

function parseCourseIds(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  } catch {
    return [];
  }
}

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
    const courseIds = parseCourseIds(form.get("course_ids"));
    const blocksJson = String(form.get("blocks") || "[]");
    const blocks = JSON.parse(blocksJson) as ResourceBlock[];

    if (!title || !description || blocks.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid fields or no blocks added" }), { status: 400, headers: jsonHeaders });
    }

    const baseSlug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "resource";
    const { data: slugMatch } = await supabase.from("resources").select("id").eq("slug", baseSlug).maybeSingle();
    const slug = slugMatch ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;
    const referralCode = await generateReferralCode(title);

    let firstPdfUrl: string | null = null;
    let firstArticleUrl: string | null = null;

    for (const block of blocks) {
      if (block.type === "pdf") {
        const fileKey = `file_${block.id}`;
        const file = form.get(fileKey);
        if (file instanceof File && file.size > 0) {
          if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: "A PDF under 10 MB is required" }), { status: 400, headers: jsonHeaders });
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from("resources").upload(path, file, { contentType: "application/pdf" });
          if (uploadError) throw uploadError;
          const publicUrl = supabase.storage.from("resources").getPublicUrl(path).data.publicUrl;
          block.pdf_url = publicUrl;
        }
        if (!firstPdfUrl && block.pdf_url) {
          firstPdfUrl = block.pdf_url;
        }
      } else if (block.type === "link") {
        if (!firstArticleUrl && block.article_url) {
          firstArticleUrl = block.article_url;
        }
      }
    }

    const insertPayload: Record<string, unknown> = {
      slug,
      title,
      description,
      type: "bundle",
      content: JSON.stringify(blocks),
      pdf_url: firstPdfUrl,
      article_url: firstArticleUrl,
      file_url: null,
      referral_code: referralCode,
      is_published: true,
    };
    if (courseIds.length > 0) {
      insertPayload.course_ids = courseIds;
    }

    let { data: inserted, error } = await supabase
      .from("resources")
      .insert(insertPayload)
      .select()
      .single();

    if (error && insertPayload.course_ids !== undefined) {
      console.warn("Retrying resource creation without course_ids column:", error.message);
      delete insertPayload.course_ids;
      const retry = await supabase
        .from("resources")
        .insert(insertPayload)
        .select()
        .single();
      inserted = retry.data;
      error = retry.error;
    }
    if (error) throw error;

    const shareUrl = new URL(`/res/${encodeURIComponent(slug)}`, request.url);
    shareUrl.searchParams.set("ref", referralCode);
    return new Response(JSON.stringify({ resource: inserted, shareUrl: shareUrl.toString() }), { status: 201, headers: jsonHeaders });
  } catch (err) {
    console.error("Resource publication failed", err);
    const details = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
    return new Response(JSON.stringify({ error: "Unable to publish resource", details }), { status: 500, headers: jsonHeaders });
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

export async function PATCH(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin || !supabase) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  try {
    const form = await request.formData();
    const id = String(form.get("id") || "");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const courseIds = form.has("course_ids") ? parseCourseIds(form.get("course_ids")) : undefined;
    const blocksJson = String(form.get("blocks") || "[]");
    const blocks = JSON.parse(blocksJson) as ResourceBlock[];

    if (!id || !title || !description || blocks.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid fields or no blocks added" }), { status: 400, headers: jsonHeaders });
    }

    let firstPdfUrl: string | null = null;
    let firstArticleUrl: string | null = null;

    for (const block of blocks) {
      if (block.type === "pdf") {
        const fileKey = `file_${block.id}`;
        const file = form.get(fileKey);
        if (file instanceof File && file.size > 0) {
          if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: "A PDF under 10 MB is required" }), { status: 400, headers: jsonHeaders });
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from("resources").upload(path, file, { contentType: "application/pdf" });
          if (uploadError) throw uploadError;
          const publicUrl = supabase.storage.from("resources").getPublicUrl(path).data.publicUrl;
          block.pdf_url = publicUrl;
        }
        if (!firstPdfUrl && block.pdf_url) {
          firstPdfUrl = block.pdf_url;
        }
      } else if (block.type === "link") {
        if (!firstArticleUrl && block.article_url) {
          firstArticleUrl = block.article_url;
        }
      }
    }

    const updatePayload: Record<string, unknown> = { title, description, content: JSON.stringify(blocks), pdf_url: firstPdfUrl, article_url: firstArticleUrl };
    if (courseIds !== undefined) {
      updatePayload.course_ids = courseIds;
    }

    let { data: updated, error } = await supabase
      .from("resources")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error && updatePayload.course_ids !== undefined) {
      console.warn("Retrying resource update without course_ids column:", error.message);
      delete updatePayload.course_ids;
      const retry = await supabase
        .from("resources")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      updated = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return new Response(JSON.stringify({ resource: updated }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("Resource update failed", error);
    const details = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
    return new Response(JSON.stringify({ error: "Unable to update resource", details }), { status: 500, headers: jsonHeaders });
  }
}
