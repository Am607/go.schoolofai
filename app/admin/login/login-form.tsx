"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setState("error");
      setErrorMessage("Incorrect email or password.");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setState("error");
      setErrorMessage("This account doesn't have admin access.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-visual-inner">
          <Image className="brand-logo login-logo" src="/brand/logo_white.png" alt="School of AI" width={2750} height={974} />
          <h1>Run the creator<br />resource library.</h1>
          <p>Sign in to publish prompts, PDFs, and articles that show up on the homepage.</p>
        </div>
        <div className="login-orbit login-orbit-one" />
        <div className="login-orbit login-orbit-two" />
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="section-kicker">ADMIN ACCESS</span>
          <h2>Welcome back</h2>
          <p>Sign in with your admin account.</p>

          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@schoolofai.so" autoFocus /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" /></label>

          <button className="button button-accent submit-button" disabled={state === "loading"}>{state === "loading" ? "Signing in…" : "Sign in"}</button>
          {state === "error" && <p className="form-error">{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}
