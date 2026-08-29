export const Icon = ({ name }: { name: "book" | "clock" | "arrow" | "arrow-right" | "copy" | "download" | "spark" | "close" | "upload" | "check" | "link" | "star" | "lock" }) => {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    "arrow-right": <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    star: <path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8L5.8 21l1.6-7-5.4-4.7 7.1-.6L12 2Z" fill="currentColor" stroke="none"/>,
    lock: <><rect width="16" height="11" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    copy: <><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/></>,
    spark: <path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    upload: <><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 18v2h16v-2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};
