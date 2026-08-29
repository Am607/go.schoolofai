"use client";

import { useState } from "react";
import Link from "next/link";
import type { Resource } from "./data";
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

function PdfPanel({ resource, pdfUrl, articleUrl }: { resource: Resource; pdfUrl: string; articleUrl?: string }) {
  return <article className="resource-card pdf-resource single-resource">
    <div className="resource-head"><span className="resource-icon"><Icon name="download" /></span><span className="resource-type">PDF RESOURCE</span></div>
    <h3>{resource.title}</h3><p>{resource.description}</p>
    <div className="pdf-embed"><iframe src={`${pdfUrl}#toolbar=0&navpanes=0`} title={`${resource.title} PDF preview`} /></div>
    <a className="resource-action pdf-download-action" href={pdfUrl} download><Icon name="download" /> Download PDF</a>
    {articleUrl && <a className="resource-action secondary-resource-action" href={articleUrl} target="_blank" rel="noopener noreferrer"><Icon name="link" /> Open link</a>}
  </article>;
}

function ArticlePanel({ resource, articleUrl }: { resource: Resource; articleUrl: string }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    await navigator.clipboard.writeText(articleUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <article className="resource-card article-resource single-resource">
    <div className="resource-head"><span className="resource-icon"><Icon name="link" /></span><span className="resource-type">LINK</span></div>
    <h3>{resource.title}</h3><p>{resource.description}</p>
    <a className="visible-resource-link" href={articleUrl} target="_blank" rel="noopener noreferrer">{articleUrl}</a>
    <div className="link-actions"><button className={`resource-action ${copied ? "done" : ""}`} type="button" onClick={copyLink}><Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy link"}</button><a className="resource-action" href={articleUrl} target="_blank" rel="noopener noreferrer"><Icon name="link" /> Open link</a></div>
  </article>;
}

export default function ResourceSplit({ prompt, sideResources, selectedResource }: { prompt: Resource | null; sideResources: Resource[]; selectedResource?: Resource }) {
  if (!prompt && !sideResources.length) return null;
  const selectedPdfUrl = selectedResource?.pdf_url || (selectedResource?.type === "pdf" ? selectedResource.file_url : undefined);
  const selectedArticleUrl = selectedResource?.article_url || (selectedResource?.type === "article" ? selectedResource.file_url : undefined);
  const showPdfOnly = Boolean(selectedResource && !selectedResource.content && selectedPdfUrl);
  const showArticleOnly = Boolean(selectedResource && !selectedResource.content && !selectedPdfUrl && selectedArticleUrl);
  const remainingSideResources = selectedResource ? [] : sideResources;

  return (
    <section className="resources-section" id="resources">
      <div className="shell">
        <div className="resources-top">
          <div><span className="section-kicker light">FREE CREATOR RESOURCES</span><h2>Steal this idea.<br /><em>We mean it.</em></h2></div>
          <p>Everything included in this resource, ready to copy, download, or read.</p>
        </div>
        <div className="resource-split">
          <div className="resource-split-col">{showPdfOnly && selectedResource && selectedPdfUrl ? <PdfPanel resource={selectedResource} pdfUrl={selectedPdfUrl} articleUrl={selectedArticleUrl} /> : showArticleOnly && selectedResource && selectedArticleUrl ? <ArticlePanel resource={selectedResource} articleUrl={selectedArticleUrl} /> : prompt && <PromptPanel prompt={prompt} />}</div>
          <div className="resource-split-col side">{remainingSideResources.map(resource => <SideResourceCard resource={resource} key={resource.id} />)}</div>
        </div>
      </div>
    </section>
  );
}
