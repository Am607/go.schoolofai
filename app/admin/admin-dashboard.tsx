"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Resource } from "../data";
import { Icon } from "../icons";
import { createClient } from "../../lib/supabase/client";

export default function AdminDashboard({ resources: initialResources, adminEmail }: { resources: Resource[]; adminEmail: string }) {
  const router = useRouter();
  const [resources, setResources] = useState(initialResources);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function signOut() { const supabase = createClient(); await supabase.auth.signOut(); router.push("/admin/login"); router.refresh(); }
  async function submitResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitState("loading");
    try {
      const response = await fetch("/api/resources", { method: "POST", body: new FormData(formElement) });
      if (!response.ok) { setSubmitState("error"); return; }
      const { resource } = await response.json();
      setResources(prev => [resource, ...prev]);
      setSubmitState("success");
      formElement.reset();
    } catch {
      setSubmitState("error");
    }
  }
  async function deleteResource(id: string) { setDeletingId(id); const response = await fetch(`/api/resources?id=${id}`, { method: "DELETE" }); if (response.ok) setResources(prev => prev.filter(r => r.id !== id)); setDeletingId(null); }

  return <div className="admin-page shell"><div className="admin-dash">
    <div className="admin-dash-head"><div><span className="section-kicker">RESOURCE MANAGER</span><h1>Manage creator resources</h1><p>Each resource creates one page containing everything you attach.</p><p>Signed in as {adminEmail}</p></div><button className="text-link" onClick={signOut} type="button">Sign out</button></div>
    <div className="admin-dash-grid">
      <form className="admin-dash-form" onSubmit={submitResource}>
        <h2>Create one resource page</h2>
        <label>Title<input name="title" required placeholder="e.g. Instagram growth toolkit" /></label>
        <label>Short description<input name="description" required placeholder="What this resource collection helps with" /></label>
        <div className="form-section"><div><span>01</span><strong>Prompt</strong><small>Optional</small></div><label>Prompt text<textarea name="content" rows={6} placeholder="The full copyable prompt" /></label></div>
        <div className="form-section"><div><span>02</span><strong>PDF guide</strong><small>Optional</small></div><label className="file-field"><Icon name="upload" /><span><strong>Upload PDF</strong><small>PDF only · max 10 MB</small></span><input type="file" name="file" accept="application/pdf" /></label></div>
        <div className="form-section"><div><span>03</span><strong>link</strong><small>Optional</small></div><label>Destination URL<input name="url" type="url" placeholder="https://..." /></label></div>
        <p className="form-hint">Add at least one item. Everything is saved under the same ID and route.</p>
        <button className="button button-accent submit-button" disabled={submitState === "loading"}>{submitState === "loading" ? "Publishing…" : submitState === "success" ? "Published" : "Create resource page"}</button>
        {submitState === "error" && <p className="form-error">Couldn&apos;t publish. Add at least one prompt, PDF, or link.</p>}
      </form>
      <div className="admin-dash-list"><div className="admin-list-heading"><strong>Published pages</strong><span>{resources.length}</span></div>{resources.length === 0 && <p className="admin-empty">No resource pages published yet.</p>}{resources.map(resource => <div className="admin-dash-item" key={resource.id}><div><strong>{resource.title}</strong><p>{resource.description}</p><div className="admin-item-types">{resource.content && <span>Prompt</span>}{(resource.pdf_url || resource.type === "pdf") && <span>PDF</span>}{(resource.article_url || resource.type === "article") && <span>Link</span>}</div><Link className="admin-view-link" href={`/res/${resource.slug}`} target="_blank">View page ↗</Link></div><button type="button" className="icon-button" onClick={() => deleteResource(resource.id)} disabled={deletingId === resource.id} aria-label={`Delete ${resource.title}`}><Icon name="close" /></button></div>)}</div>
    </div>
  </div></div>;
}
