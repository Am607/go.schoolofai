import { getCourses } from "../../data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const courses = await getCourses();
    return Response.json({ courses }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Failed to fetch courses API", error);
    return Response.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
