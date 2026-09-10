"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getResourceBlocks } from "../data";
import type { Course, Resource, ResourceBlock } from "../data";
import { Icon } from "../icons";

const PUBLIC_SITE_URL = "https://go.schoolofai.so";

const generateBlockId = () => "block-" + Math.random().toString(36).substring(2, 9);

function CourseMultiSelect({ courses, value, onChange }: { courses: Course[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = value.map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c));
  const available = courses.filter(c => !value.includes(c.id));

  return (
    <div className="course-multiselect" ref={containerRef}>
      <button type="button" className="course-multiselect-control" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {selected.length === 0
          ? <span className="course-multiselect-placeholder">Select course(s)…</span>
          : <span className="course-tags">
              {selected.map(c => (
                <span className="course-tag" key={c.id}>
                  {c.title}
                  <span
                    className="course-tag-remove"
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${c.title}`}
                    onClick={(e) => { e.stopPropagation(); onChange(value.filter(v => v !== c.id)); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange(value.filter(v => v !== c.id)); } }}
                  >
                    <Icon name="close" />
                  </span>
                </span>
              ))}
            </span>}
        <span className="course-multiselect-chevron" style={{ transform: open ? "rotate(-90deg)" : "rotate(90deg)" }}><Icon name="arrow" /></span>
      </button>
      {open && (
        <div className="course-multiselect-menu">
          {available.length === 0
            ? <p className="course-multiselect-empty">{courses.length === 0 ? "No courses available yet." : "All courses selected."}</p>
            : available.map(c => (
              <button
                type="button"
                key={c.id}
                className="course-multiselect-option"
                onClick={() => { onChange([...value, c.id]); setOpen(false); }}
              >
                {c.title} {c.isUpcoming ? "(Coming soon)" : ""}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ resources: initialResources, initialCourses = [], adminEmail }: { resources: Resource[]; initialCourses?: Course[]; adminEmail: string }) {
  const [resources, setResources] = useState(initialResources);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editState, setEditState] = useState<"idle" | "loading" | "error">("idle");
  const [createCourseIds, setCreateCourseIds] = useState<string[]>([]);
  const [editCourseIds, setEditCourseIds] = useState<string[]>([]);
  const [signOutState, setSignOutState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    fetch("/api/courses")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        }
      })
      .catch(err => console.error("Failed to fetch courses API:", err));
  }, []);

  const [createBlocks, setCreateBlocks] = useState<ResourceBlock[]>(() => [
    { id: generateBlockId(), type: "text", title: "Prompt instructions", description: "" }
  ]);
  const [editBlocks, setEditBlocks] = useState<ResourceBlock[]>([]);

  function addBlock(isEdit: boolean) {
    const newBlock: ResourceBlock = {
      id: generateBlockId(),
      type: "text",
      title: "",
      description: ""
    };
    if (isEdit) {
      setEditBlocks(prev => [...prev, newBlock]);
    } else {
      setCreateBlocks(prev => [...prev, newBlock]);
    }
  }

  function removeBlock(id: string, isEdit: boolean) {
    if (isEdit) {
      setEditBlocks(prev => prev.filter(b => b.id !== id));
    } else {
      setCreateBlocks(prev => prev.filter(b => b.id !== id));
    }
  }

  function updateBlock(id: string, updates: Partial<ResourceBlock>, isEdit: boolean) {
    if (isEdit) {
      setEditBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    } else {
      setCreateBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }
  }

  function moveBlock(index: number, direction: "up" | "down", isEdit: boolean) {
    const blocksList = isEdit ? editBlocks : createBlocks;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocksList.length) return;
    const nextBlocks = [...blocksList];
    const temp = nextBlocks[index];
    nextBlocks[index] = nextBlocks[targetIndex];
    nextBlocks[targetIndex] = temp;
    if (isEdit) {
      setEditBlocks(nextBlocks);
    } else {
      setCreateBlocks(nextBlocks);
    }
  }

  async function signOut() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    setSignOutState("loading");
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) {
        setSignOutState("error");
        return;
      }
      window.location.replace("/admin/login");
    } catch {
      setSignOutState("error");
    }
  }

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
      setCreateBlocks([
        { id: generateBlockId(), type: "text", title: "Prompt instructions", description: "" }
      ]);
      setCreateCourseIds([]);
      setTimeout(() => {
        setSubmitState(current => current === "success" ? "idle" : current);
      }, 3000);
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

  function renderBlockEditor(blocksList: ResourceBlock[], isEdit: boolean) {
    return (
      <div className="admin-blocks-container">
        <h3>Resource Content Blocks</h3>
        {blocksList.length === 0 && <p className="admin-empty">No blocks added yet. Add a block below.</p>}
        {blocksList.map((block, index) => (
          <div key={block.id} className="admin-block-card">
            <div className="admin-block-card-header">
              <h4>Block #{index + 1}: {block.type.toUpperCase()}</h4>
              <div className="admin-block-controls">
                <button
                  type="button"
                  className="icon-button edit-button"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, "up", isEdit)}
                  title="Move Up"
                >
                  <span style={{ display: "inline-flex", transform: "rotate(-90deg)" }}><Icon name="arrow" /></span>
                </button>
                <button
                  type="button"
                  className="icon-button edit-button"
                  disabled={index === blocksList.length - 1}
                  onClick={() => moveBlock(index, "down", isEdit)}
                  title="Move Down"
                >
                  <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}><Icon name="arrow" /></span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => removeBlock(block.id, isEdit)}
                  title="Delete Block"
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>

            <label>
              Type
              <select
                value={block.type}
                onChange={(e) => updateBlock(block.id, { type: e.target.value as "text" | "pdf" | "link" }, isEdit)}
              >
                <option value="text">Copy & Use Prompt (Text)</option>
                <option value="pdf">PDF File Guide</option>
                <option value="link">Destination Link</option>
              </select>
            </label>

            <label>
              Title
              <input
                type="text"
                value={block.title}
                onChange={(e) => updateBlock(block.id, { title: e.target.value }, isEdit)}
                placeholder="e.g. Prompt formula, PDF Cheat Sheet"
                required
              />
            </label>

            <label>
              Subtitle / Description
              <input
                type="text"
                value={block.description}
                onChange={(e) => updateBlock(block.id, { description: e.target.value }, isEdit)}
                placeholder="e.g. Copy this to generate hooks, 5-step pdf resource guide"
              />
            </label>

            {block.type === "text" && (
              <label>
                Prompt / Text Content
                <textarea
                  value={block.content || ""}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value }, isEdit)}
                  rows={5}
                  placeholder="Paste the copyable prompt text here..."
                  required
                />
              </label>
            )}

            {block.type === "pdf" && (
              <div style={{ display: "grid", gap: "8px" }}>
                {block.pdf_url && (
                  <div className="admin-share-row" style={{ marginTop: 0 }}>
                    <a className="admin-view-link" href={block.pdf_url} target="_blank" rel="noreferrer">
                      <Icon name="link" />
                      <span>{block.pdf_url}</span>
                    </a>
                  </div>
                )}
                <label className="file-field">
                  <Icon name="upload" />
                  <span>
                    <strong>{block.pdf_url ? "Replace PDF" : "Upload PDF"}</strong>
                    <small>PDF only · max 10 MB</small>
                  </span>
                  <input
                    type="file"
                    name={`file_${block.id}`}
                    accept="application/pdf"
                    required={!block.pdf_url}
                  />
                </label>
              </div>
            )}

            {block.type === "link" && (
              <label>
                Link Destination URL
                <input
                  type="url"
                  value={block.article_url || ""}
                  onChange={(e) => updateBlock(block.id, { article_url: e.target.value }, isEdit)}
                  placeholder="https://example.com/..."
                  required
                />
              </label>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="button"
            className="button"
            style={{ background: "#f2f0e8" }}
            onClick={() => addBlock(isEdit)}
          >
            + Add Block
          </button>
        </div>
      </div>
    );
  }

  return <div className="admin-page shell"><div className="admin-dash">
    <div className="admin-dash-head"><div><span className="section-kicker">RESOURCE MANAGER</span><h1>Manage creator resources</h1><p>Each resource creates one page containing everything you attach.</p><p>Signed in as {adminEmail}</p>{signOutState === "error" && <p className="form-error">Couldn&apos;t sign out. Please try again.</p>}</div><button className="text-link" onClick={signOut} type="button" disabled={signOutState === "loading"}>{signOutState === "loading" ? "Signing out…" : "Sign out"}</button></div>
    <div className="admin-dash-grid">
      <form
        className="admin-dash-form"
        onSubmit={submitResource}
        onChange={() => {
          if (submitState === "success" || submitState === "error") {
            setSubmitState("idle");
          }
        }}
      >
        <h2>Create one resource page</h2>
        <label>Title<input name="title" required placeholder="e.g. Instagram growth toolkit" /></label>
        <label>Short description<input name="description" required placeholder="What this resource collection helps with" /></label>
        <label>Display Course(s) on Top
          <CourseMultiSelect courses={courses} value={createCourseIds} onChange={setCreateCourseIds} />
        </label>
        <p className="form-hint">Click to pick courses one at a time. Click the × on a tag to remove it.</p>

        {renderBlockEditor(createBlocks, false)}
        <input type="hidden" name="blocks" value={JSON.stringify(createBlocks)} />
        <input type="hidden" name="course_ids" value={JSON.stringify(createCourseIds)} />

        <p className="form-hint">Add at least one content block. All blocks are saved under the same ID and route.</p>
        <button className="button button-accent submit-button" disabled={submitState === "loading"}>{submitState === "loading" ? "Publishing…" : submitState === "success" ? "Published" : "Create resource page"}</button>
        {submitState === "error" && <p className="form-error">Couldn&apos;t publish the resource. Please try again.</p>}
      </form>
      <div className="admin-dash-list"><div className="admin-list-heading"><strong>Published pages</strong><span>{resources.length}</span></div>{resources.length === 0 && <p className="admin-empty">No resource pages published yet.</p>}{resources.map(resource => {
        const resourcePath = `/res/${resource.slug}`;
        const sharePath = resource.referral_code ? `${resourcePath}?ref=${encodeURIComponent(resource.referral_code)}` : resourcePath;
        const shareUrl = `${PUBLIC_SITE_URL}${sharePath}`;
        const isCopied = copiedId === resource.id;

        const blocks = getResourceBlocks(resource);
        const hasPrompt = blocks.some(b => b.type === "text");
        const hasPdf = blocks.some(b => b.type === "pdf");
        const hasLink = blocks.some(b => b.type === "link");
        const linkedCourses = (resource.course_ids ?? []).map(id => courses.find(c => c.id === id || c.slug === id)).filter((c): c is Course => Boolean(c));

        return <div className="admin-dash-item" key={resource.id}><div className="admin-item-content"><strong>{resource.title}</strong><p>{resource.description}</p><div className="admin-item-types">{hasPrompt && <span>Prompt</span>}{hasPdf && <span>PDF</span>}{hasLink && <span>Link</span>}{linkedCourses.length > 0 && <span>Top course{linkedCourses.length > 1 ? "s" : ""}</span>}{linkedCourses.map(c => <span key={c.id} style={{ background: "#eaffb0", color: "#4d5c05", borderColor: "rgba(153, 189, 0, 0.4)" }}>{c.title}</span>)}</div><div className="admin-share-row"><Link className="admin-view-link" href={shareUrl} target="_blank" rel="noreferrer" title={shareUrl}><Icon name="link" /><span>{shareUrl}</span></Link><button className={`copy-link-button${isCopied ? " copied" : ""}`} type="button" onClick={() => copyShareLink(resource)} aria-label={`Copy link for ${resource.title}`}><Icon name={isCopied ? "check" : "copy"} /><span aria-live="polite">{isCopied ? "Copied" : "Copy"}</span></button></div></div><div className="admin-item-actions"><button type="button" className="icon-button edit-button" onClick={() => { setEditingResource(resource); setEditBlocks(getResourceBlocks(resource)); setEditCourseIds(resource.course_ids ?? []); setEditState("idle"); }} aria-label={`Edit ${resource.title}`}><Icon name="edit" /></button><button type="button" className="icon-button" onClick={() => deleteResource(resource)} disabled={deletingId === resource.id} aria-label={`Delete ${resource.title}`}><Icon name="close" /></button></div></div>;
      })}</div>
    </div>
    {editingResource && <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditingResource(null); }}><form className="admin-edit-modal" onSubmit={updateResource}><div className="admin-edit-head"><div><span className="section-kicker">EDIT RESOURCE</span><h2>{editingResource.title}</h2></div><button type="button" className="icon-button" onClick={() => setEditingResource(null)} aria-label="Close edit form"><Icon name="close" /></button></div><label>Title<input name="title" required defaultValue={editingResource.title} /></label><label>Short description<input name="description" required defaultValue={editingResource.description} /></label><label>Display Course(s) on Top
      <CourseMultiSelect courses={courses} value={editCourseIds} onChange={setEditCourseIds} />
    </label>
      <p className="form-hint">Click to pick courses one at a time. Click the × on a tag to remove it.</p>

      {renderBlockEditor(editBlocks, true)}
      <input type="hidden" name="blocks" value={JSON.stringify(editBlocks)} />
      <input type="hidden" name="course_ids" value={JSON.stringify(editCourseIds)} />

      {editState === "error" && <p className="form-error">Couldn&apos;t save your changes. Please check the fields and retry.</p>}<div className="admin-edit-actions"><button type="button" className="button" onClick={() => setEditingResource(null)}>Cancel</button><button className="button button-accent" disabled={editState === "loading"}>{editState === "loading" ? "Saving…" : "Save changes"}</button></div></form></div>}
  </div></div>;
}
