// One-off script: creates the admin auth user and marks their profile as admin.
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, and
// ADMIN_PASSWORD in the environment.
//
// Usage: node --env-file=.env.local scripts/create-admin.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceKey || !email || !password) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, and ADMIN_PASSWORD before running this script.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  let userId;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    if (!createError.message.includes("already been registered")) throw createError;
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find(u => u.email === email);
    if (!existing) throw new Error("User already registered but could not be found");
    userId = existing.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateError) throw updateError;
    console.log("User already exists; password updated.");
  } else {
    userId = created.user.id;
    console.log("Created auth user:", email);
  }

  const { error: profileError } = await admin.from("profiles").upsert({ id: userId, email, role: "admin" });
  if (profileError) throw profileError;

  console.log("Profile set to role=admin for", email);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
