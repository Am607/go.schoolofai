export type Course = { id: string; slug: string; title: string; description: string; thumbnailUrl: string; modulesCount: number; lessonsCount: number; isUpcoming: boolean; ratingAvg: number | null; ratingCount: number };
export type Resource = { id: string; slug: string; course_id?: string; title: string; description: string; type: "prompt" | "pdf" | "article" | "bundle"; content?: string; file_url?: string; pdf_url?: string; article_url?: string; referral_code?: string; is_featured?: boolean };

const fallbackCourses: Course[] = [
  { id: "ai-content", slug: "ai-content-mastery", title: "AI Content Mastery", description: "Build a repeatable content system with AI — from idea to published post, without losing your voice.", thumbnailUrl: "", modulesCount: 6, lessonsCount: 18, isUpcoming: false, ratingAvg: 4.8, ratingCount: 32 },
  { id: "prompt-engineering", slug: "prompt-engineering-pro", title: "Prompt Engineering Pro", description: "Learn the frameworks behind precise prompts and get consistently useful results from every leading AI tool.", thumbnailUrl: "", modulesCount: 8, lessonsCount: 24, isUpcoming: false, ratingAvg: 4.9, ratingCount: 21 },
  { id: "instagram-growth", slug: "instagram-growth-lab", title: "Instagram Growth Lab", description: "Turn your expertise into a focused Instagram brand with stronger hooks, reels, and conversion-ready content.", thumbnailUrl: "", modulesCount: 5, lessonsCount: 15, isUpcoming: false, ratingAvg: 4.7, ratingCount: 18 },
];
const fallbackResources: Resource[] = [
  { id: "p1", slug: "the-30-day-content-planner", course_id: "ai-content", title: "The 30-day content planner", description: "Turn one topic into a full month of platform-ready posts.", type: "prompt", is_featured: true, content: "Act as an expert content strategist. My niche is [NICHE], my audience is [AUDIENCE], and my primary offer is [OFFER]. Create a 30-day Instagram content plan with a balanced mix of educational carousels, relatable reels, authority posts, and conversion stories. For each day include a hook, format, key talking points, and a natural call to action. Keep the voice [VOICE]." },
  { id: "p2", slug: "high-retention-reel-script", course_id: "prompt-engineering", title: "High-retention reel script", description: "Write a concise reel that earns attention and keeps it.", type: "prompt", content: "Write a 30-second Instagram Reel script about [TOPIC] for [AUDIENCE]. Open with a pattern-interrupt hook under 8 words, build curiosity with three short beats, include one unexpected insight, and end with a save-worthy call to action. Make it conversational, specific, and free of generic advice." },
  { id: "p3", slug: "carousel-that-gets-saved", course_id: "instagram-growth", title: "Carousel that gets saved", description: "Build an educational carousel with a clear, swipeable story.", type: "prompt", content: "Create a 7-slide Instagram carousel about [TOPIC]. Slide 1 must be a bold outcome-driven hook. Slides 2–6 should each teach one actionable step with fewer than 25 words. Slide 7 should summarize the transformation and invite the reader to save or share. Add a caption that expands the idea without repeating the slides." },
  { id: "d1", slug: "the-creators-ai-playbook", course_id: "ai-content", title: "The creator’s AI playbook", description: "A practical guide to planning, creating, and repurposing content with AI.", type: "pdf", file_url: "#", is_featured: true },
  { id: "a1", slug: "why-most-ai-prompts-fail", course_id: "prompt-engineering", title: "Why most AI prompts fail", description: "A breakdown of the habits that separate vague prompts from ones that consistently work.", type: "article", file_url: "#" },
];
type ApiCourse = { id: number; title: string; slug: string; description: string; thumbnail_url: string; is_upcoming: boolean; modules_count: number; lessons_count: number; rating_avg: number | null; rating_count: number };

export async function getCourses(): Promise<Course[]> {
  try {
    const response = await fetch("https://api.schoolofai.so/api/courses/", { next: { revalidate: 300 } });
    if (!response.ok) throw new Error();
    const json = await response.json() as { results: ApiCourse[] };
    if (!json.results?.length) return fallbackCourses;
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
    return fallbackCourses;
  }
}
export async function getResources(): Promise<Resource[]> { const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY; if (!url || !key) return fallbackResources; try { const response = await fetch(`${url}/rest/v1/resources?select=*&is_published=eq.true&order=created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }); if (!response.ok) throw new Error(); const rows = await response.json() as Resource[]; return rows.length ? rows : fallbackResources; } catch { return fallbackResources; } }

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return fallbackResources.find(resource => resource.slug === slug) ?? null;
  try {
    const response = await fetch(`${url}/rest/v1/resources?select=*&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!response.ok) return null;
    const rows = await response.json() as Resource[];
    return rows[0] ?? null;
  } catch { return null; }
}
