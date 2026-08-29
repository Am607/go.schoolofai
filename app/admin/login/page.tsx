import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "../../../lib/supabase/server";
import LoginForm from "./login-form";
import SetupNotice from "../setup-notice";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "admin") redirect("/admin");
  }

  return <LoginForm />;
}
