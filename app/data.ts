export type Course = { id: string; slug: string; title: string; description: string; thumbnailUrl: string; modulesCount: number; lessonsCount: number; isUpcoming: boolean; ratingAvg: number | null; ratingCount: number };
export type Resource = { id: string; slug: string; course_id?: string; title: string; description: string; type: "prompt" | "pdf" | "article" | "bundle"; content?: string; file_url?: string; pdf_url?: string; article_url?: string; referral_code?: string; is_featured?: boolean };

type ApiCourse = { id: number; title: string; slug: string; description: string; thumbnail_url: string; is_upcoming: boolean; modules_count: number; lessons_count: number; rating_avg: number | null; rating_count: number };

export async function getCourses(): Promise<Course[]> {
  try {
    const response = await fetch("https://api.schoolofai.so/api/courses/", { next: { revalidate: 300 } });
    if (!response.ok) throw new Error();
    const json = await response.json() as { results: ApiCourse[] };
    if (!json.results?.length) return [];
    return json.results.map(c => ({
      id: String(c.id),
      slug: c.slug,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnail_url,
      modulesCount: c.modules_count,
      lessonsCount: c.lessons_count,
      isUpcoming: c.is_upcoming,
      ratingAvg: c.rating_avg,
      ratingCount: c.rating_count,
    }));
  } catch {
    return [];
  }
}
export async function getResources(): Promise<Resource[]> { const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY; if (!url || !key) return []; try { const response = await fetch(`${url}/rest/v1/resources?select=*&is_published=eq.true&order=created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }); if (!response.ok) throw new Error(); return await response.json() as Resource[]; } catch { return []; } }

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const response = await fetch(`${url}/rest/v1/resources?select=*&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!response.ok) return null;
    const rows = await response.json() as Resource[];
    return rows[0] ?? null;
  } catch { return null; }
}
