export default function SetupNotice() {
  return (
    <div className="admin-page shell">
      <div className="admin-login">
        <span className="section-kicker">SETUP NEEDED</span>
        <h1>Connect Supabase first</h1>
        <p>
          Admin login isn&apos;t wired up yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment (see <code>.env.example</code>), run{" "}
          <code>supabase/schema.sql</code> against your project, then run <code>npm run seed:admin</code> to create the
          admin account.
        </p>
      </div>
    </div>
  );
}
