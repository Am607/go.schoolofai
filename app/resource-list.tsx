"use client";

import { useState } from "react";
import Link from "next/link";
import { getResourceBlocks } from "./data";
import type { Resource, ResourceBlock } from "./data";
import { Icon } from "./icons";

function PromptPanel({ prompt }: { prompt: Resource }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!prompt.content) return;
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="resource-card prompt single-resource">
      <div className="resource-head"><span className="resource-icon"><Icon name="spark" /></span><span className="resource-type">COPY & USE PROMPT</span></div>
      <h3><Link href={`/res/${prompt.slug}`} scroll={false}>{prompt.title}</Link></h3>
      <p>{prompt.description}</p>
      <div className="prompt-box">{prompt.content}</div>
      <div className="resource-card-actions"><button className={`resource-action ${copied ? "done" : ""}`} onClick={copyPrompt}><Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy prompt"}</button></div>
      {(prompt.pdf_url || prompt.article_url) && <div className="bundle-links">{prompt.pdf_url && <a href={prompt.pdf_url} download><Icon name="download" /> Download PDF</a>}{prompt.article_url && <a href={prompt.article_url} target="_blank" rel="noopener noreferrer"><Icon name="link" /> Open link</a>}</div>}
    </article>
  );
}

function SideResourceCard({ resource }: { resource: Resource }) {
  const isArticle = Boolean(resource.article_url || resource.type === "article");
  return (
    <article className={`resource-card side-resource ${resource.type}`}>
      <div className="resource-head"><span className="resource-icon"><Icon name={isArticle ? "link" : "download"} /></span><span className="resource-type">RESOURCE KIT</span></div>
      <h3><Link href={`/res/${resource.slug}`} scroll={false}>{resource.title}</Link></h3>
      <p>{resource.description}</p>
      <Link className="resource-action" href={`/res/${resource.slug}`} scroll={false}><Icon name={isArticle ? "link" : "download"} /> Load this resource</Link>
    </article>
  );
}

function BlockPromptPanel({ block }: { block: ResourceBlock }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!block.content) return;
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="resource-card prompt block-resource-card">
      <div className="resource-head">
        <span className="resource-icon"><Icon name="spark" /></span>
        <span className="resource-type">COPY & USE PROMPT</span>
      </div>
      {block.title && <h3>{block.title}</h3>}
      {block.description && <p>{block.description}</p>}
      {block.content && <div className="prompt-box block-prompt-box">{block.content}</div>}
      <div className="resource-card-actions" style={{ marginTop: block.content ? "18px" : "auto" }}>
        <button className={`resource-action ${copied ? "done" : ""}`} onClick={copyPrompt}>
          <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy prompt"}
        </button>
      </div>
    </article>
  );
}

function BlockPdfPanel({ block }: { block: ResourceBlock }) {
  const pdfUrl = block.pdf_url;
  if (!pdfUrl) return null;
  return (
    <article className="resource-card pdf-resource block-resource-card pdf">
      <div className="resource-head">
        <span className="resource-icon"><Icon name="download" /></span>
        <span className="resource-type">PDF RESOURCE</span>
      </div>
      {block.title && <h3>{block.title}</h3>}
      {block.description && <p>{block.description}</p>}
      <div className="pdf-embed">
        <iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} title={`${block.title || "PDF"} preview`} />
      </div>
      <a className="resource-action pdf-download-action" href={pdfUrl} download>
        <Icon name="download" /> Download PDF
      </a>
    </article>
  );
}

function BlockArticlePanel({ block }: { block: ResourceBlock }) {
  const [copied, setCopied] = useState(false);
  const articleUrl = block.article_url || "";

  async function copyLink() {
    await navigator.clipboard.writeText(articleUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article className="resource-card article-resource block-resource-card">
      <div className="resource-head">
        <span className="resource-icon"><Icon name="link" /></span>
        <span className="resource-type">LINK</span>
      </div>
      {block.title && <h3>{block.title}</h3>}
      {block.description && <p>{block.description}</p>}
      {articleUrl && <a className="visible-resource-link" href={articleUrl} target="_blank" rel="noopener noreferrer">{articleUrl}</a>}
      <div className="link-actions" style={{ marginTop: "18px" }}>
        <button className={`resource-action ${copied ? "done" : ""}`} type="button" onClick={copyLink}>
          <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy link"}
        </button>
        <a className="resource-action" href={articleUrl} target="_blank" rel="noopener noreferrer">
          <Icon name="link" /> Open link
        </a>
      </div>
    </article>
  );
}

export default function ResourceSplit({ prompt, sideResources, selectedResource }: { prompt: Resource | null; sideResources: Resource[]; selectedResource?: Resource }) {
  if (!prompt && !sideResources.length) return null;
  const remainingSideResources = selectedResource ? [] : sideResources;
  const blocks = selectedResource ? getResourceBlocks(selectedResource) : [];

  return (
    <section className="resources-section" id="resources">
      <div className="shell">
        <div className="resources-top">
          <div><span className="section-kicker light">FREE CREATOR RESOURCES</span><h2>Steal this idea.<br /><em>We mean it.</em></h2></div>
          <p>Everything included in this resource, ready to copy, download, or read.</p>
        </div>
        <div className="resource-split">
          <div className="resource-split-col">
            {selectedResource ? (
              blocks.map((block) => {
                if (block.type === "text") {
                  return <BlockPromptPanel key={block.id} block={block} />;
                } else if (block.type === "pdf") {
                  return <BlockPdfPanel key={block.id} block={block} />;
                } else if (block.type === "link") {
                  return <BlockArticlePanel key={block.id} block={block} />;
                }
                return null;
              })
            ) : prompt ? (
              <PromptPanel prompt={prompt} />
            ) : null}
          </div>
          <div className="resource-split-col side">
            {remainingSideResources.map(resource => <SideResourceCard resource={resource} key={resource.id} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
