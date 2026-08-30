"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Resource } from "../data";
import { Icon } from "../icons";
import { createClient } from "../../lib/supabase/client";

const PUBLIC_SITE_URL = "https://go.schoolofai.so";

export default function AdminDashboard({ resources: initialResources, adminEmail }: { resources: Resource[]; adminEmail: string }) {
  const router = useRouter();
  const [resources, setResources] = useState(initialResources);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editState, setEditState] = useState<"idle" | "loading" | "error">("idle");

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
  async function deleteResource(resource: Resource) { if (!window.confirm(`Delete “${resource.title}”? This cannot be undone.`)) return; setDeletingId(resource.id); const response = await fetch(`/api/resources?id=${resource.id}`, { method: "DELETE" }); if (response.ok) setResources(prev => prev.filter(r => r.id !== resource.id)); setDeletingId(null); }
  async function updateResource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingResource) return;
    setEditState("loading");
    const form = new FormData(event.currentTarget);
    form.set("id", editingResource.id);
    const response = await fetch("/api/resources", { method: "PATCH", body: form });
    if (!response.ok) { setEditState("error"); return; }
    const { resource } = await response.json();
    setResources(prev => prev.map(item => item.id === resource.id ? resource : item));
    setEditingResource(null);
    setEditState("idle");
  }
  async function copyShareLink(resource: Resource) {
    const shareUrl = new URL(`/res/${resource.slug}`, PUBLIC_SITE_URL);
    if (resource.referral_code) shareUrl.searchParams.set("ref", resource.referral_code);
    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      setCopiedId(resource.id);
      window.setTimeout(() => setCopiedId(current => current === resource.id ? null : current), 2000);
    } catch {
      setCopiedId(null);
    }
  }

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
        {submitState === "error" && <p className="form-error">Couldn&apos;t publish the resource. Please try again.</p>}
      </form>
      <div className="admin-dash-list"><div className="admin-list-heading"><strong>Published pages</strong><span>{resources.length}</span></div>{resources.length === 0 && <p className="admin-empty">No resource pages published yet.</p>}{resources.map(resource => {
        const resourcePath = `/res/${resource.slug}`;
        const sharePath = resource.referral_code ? `${resourcePath}?ref=${encodeURIComponent(resource.referral_code)}` : resourcePath;
        const shareUrl = `${PUBLIC_SITE_URL}${sharePath}`;
        const isCopied = copiedId === resource.id;
        return <div className="admin-dash-item" key={resource.id}><div className="admin-item-content"><strong>{resource.title}</strong><p>{resource.description}</p><div className="admin-item-types">{resource.content && <span>Prompt</span>}{(resource.pdf_url || resource.type === "pdf") && <span>PDF</span>}{(resource.article_url || resource.type === "article") && <span>Link</span>}</div><div className="admin-share-row"><Link className="admin-view-link" href={shareUrl} target="_blank" rel="noreferrer" title={shareUrl}><Icon name="link" /><span>{shareUrl}</span></Link><button className={`copy-link-button${isCopied ? " copied" : ""}`} type="button" onClick={() => copyShareLink(resource)} aria-label={`Copy link for ${resource.title}`}><Icon name={isCopied ? "check" : "copy"} /><span aria-live="polite">{isCopied ? "Copied" : "Copy"}</span></button></div></div><div className="admin-item-actions"><button type="button" className="icon-button edit-button" onClick={() => { setEditingResource(resource); setEditState("idle"); }} aria-label={`Edit ${resource.title}`}><Icon name="edit" /></button><button type="button" className="icon-button" onClick={() => deleteResource(resource)} disabled={deletingId === resource.id} aria-label={`Delete ${resource.title}`}><Icon name="close" /></button></div></div>;
      })}</div>
    </div>
    {editingResource && <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditingResource(null); }}><form className="admin-edit-modal" onSubmit={updateResource}><div className="admin-edit-head"><div><span className="section-kicker">EDIT RESOURCE</span><h2>{editingResource.title}</h2></div><button type="button" className="icon-button" onClick={() => setEditingResource(null)} aria-label="Close edit form"><Icon name="close" /></button></div><label>Title<input name="title" required defaultValue={editingResource.title} /></label><label>Short description<input name="description" required defaultValue={editingResource.description} /></label><label>Prompt text<textarea name="content" rows={5} defaultValue={editingResource.content || ""} /></label><label>Destination URL<input name="url" type="url" placeholder="https://..." defaultValue={editingResource.article_url || ""} /></label><label className="file-field"><Icon name="upload" /><span><strong>{editingResource.pdf_url ? "Replace PDF" : "Upload PDF"}</strong><small>Optional · PDF only · max 10 MB</small></span><input type="file" name="file" accept="application/pdf" /></label>{editState === "error" && <p className="form-error">Couldn&apos;t save your changes. Please check the fields and retry.</p>}<div className="admin-edit-actions"><button type="button" className="button" onClick={() => setEditingResource(null)}>Cancel</button><button className="button button-accent" disabled={editState === "loading"}>{editState === "loading" ? "Saving…" : "Save changes"}</button></div></form></div>}
  </div></div>;
}
