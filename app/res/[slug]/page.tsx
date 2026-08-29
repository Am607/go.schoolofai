import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourses, getResourceBySlug, getResources } from "../../data";
import { HomeExperience } from "../../page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);
  return resource ? { title: `${resource.title} | SOAI Resources`, description: resource.description } : { title: "Resource not found | SOAI" };
}

export default async function ResourceRoute({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string | string[] }> }) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const referralCode = Array.isArray(ref) ? ref[0] : ref;
  const [selectedResource, courses, resources] = await Promise.all([getResourceBySlug(slug), getCourses(), getResources()]);
  if (!selectedResource) notFound();
  return <HomeExperience courses={courses} resources={resources} selectedResource={selectedResource} referralCode={referralCode} />;
}
