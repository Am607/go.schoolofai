export type Course = { id: string; slug: string; title: string; description: string; thumbnailUrl: string; modulesCount: number; lessonsCount: number; isUpcoming: boolean; ratingAvg: number | null; ratingCount: number };
export type Resource = { id: string; slug: string; course_ids?: string[]; title: string; description: string; type: "prompt" | "pdf" | "article" | "bundle"; content?: string; file_url?: string; pdf_url?: string; article_url?: string; referral_code?: string; is_featured?: boolean };

export type ResourceBlock = {
  id: string;
  type: "text" | "pdf" | "link";
  title: string;
  description: string;
  content?: string;
  pdf_url?: string;
  article_url?: string;
};

export function getResourceBlocks(resource: Resource): ResourceBlock[] {
  if (!resource.content) return [];
  try {
    const parsed = JSON.parse(resource.content);
    if (Array.isArray(parsed)) {
      return parsed as ResourceBlock[];
    }
  } catch {
    // Treat as legacy text/prompt content
  }

  const blocks: ResourceBlock[] = [];
  if (resource.content) {
    blocks.push({
      id: "legacy-prompt",
      type: "text",
      title: "Prompt Text",
      description: "",
      content: resource.content,
    });
  }
  if (resource.pdf_url) {
    blocks.push({
      id: "legacy-pdf",
      type: "pdf",
      title: "PDF Guide",
      description: "",
      pdf_url: resource.pdf_url,
    });
  }
  if (resource.article_url) {
    blocks.push({
      id: "legacy-link",
      type: "link",
      title: "Link",
      description: "",
      article_url: resource.article_url,
    });
  }
  return blocks;
}

type ApiCourse = { id: number; title: string; slug: string; description: string; thumbnail_url: string; is_upcoming: boolean; modules_count: number; lessons_count: number; rating_avg: number | null; rating_count: number };

async function fetchCoursesFromApi(): Promise<Course[]> {
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

// Upserts freshly fetched courses into Supabase so they survive a flaky or
// rate-limited call to the live course API. Requires the service-role key
// since the `courses` table has no public write policy.
async function syncCoursesToDb(courses: Course[]): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || courses.length === 0) return;
  try {
    await fetch(`${url}/rest/v1/courses`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(courses.map(c => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        thumbnail_url: c.thumbnailUrl,
        modules_count: c.modulesCount,
        lessons_count: c.lessonsCount,
        is_upcoming: c.isUpcoming,
        rating_avg: c.ratingAvg,
        rating_count: c.ratingCount,
        updated_at: new Date().toISOString(),
      }))),
    });
  } catch (err) {
    console.error("Failed to sync courses to Supabase", err);
  }
}

type DbCourse = { id: string; slug: string; title: string; description: string | null; thumbnail_url: string | null; modules_count: number; lessons_count: number; is_upcoming: boolean; rating_avg: number | null; rating_count: number };

// Reads the last-synced snapshot from Supabase. Used as a fallback when the
// live course API is unreachable, so the admin dropdown and homepage still
// show courses instead of an empty list.
async function getCoursesFromDb(): Promise<Course[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(`${url}/rest/v1/courses?select=*&order=title.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const rows = await response.json() as DbCourse[];
    return rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      thumbnailUrl: r.thumbnail_url ?? "",
      modulesCount: r.modules_count,
      lessonsCount: r.lessons_count,
      isUpcoming: r.is_upcoming,
      ratingAvg: r.rating_avg,
      ratingCount: r.rating_count,
    }));
  } catch {
    return [];
  }
}

export async function getCourses(): Promise<Course[]> {
  const live = await fetchCoursesFromApi();
  if (live.length > 0) {
    await syncCoursesToDb(live);
    return live;
  }
  // Live API failed or returned nothing — fall back to the last synced copy.
  return getCoursesFromDb();
}

// Which courses (if any) an admin has chosen to feature on the homepage.
// Empty means "show no courses" — the homepage skips the courses section
// entirely rather than defaulting to showing everything.
export async function getHomeCourseIds(): Promise<string[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(`${url}/rest/v1/site_settings?select=home_course_ids&id=eq.1&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const rows = await response.json() as { home_course_ids: string[] | null }[];
    return rows[0]?.home_course_ids ?? [];
  } catch {
    return [];
  }
}

// Only hits the course API/DB when the admin has actually picked courses to
// show, so the homepage doesn't load the full course catalog on every visit.
export async function getHomeCourses(): Promise<Course[]> {
  const ids = await getHomeCourseIds();
  if (ids.length === 0) return [];
  const all = await getCourses();
  const byId = new Map(all.map(c => [c.id, c] as const));
  return ids.map(id => byId.get(id)).filter((c): c is Course => Boolean(c));
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
