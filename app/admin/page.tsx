import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "../../lib/supabase/server";
import { getCourses, getResources } from "../data";
import AdminDashboard from "./admin-dashboard";
import SetupNotice from "./setup-notice";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role, email").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin/login");

  const [resources, courses] = await Promise.all([getResources(), getCourses()]);

  return <AdminDashboard resources={resources} initialCourses={courses} adminEmail={profile.email} />;
}
