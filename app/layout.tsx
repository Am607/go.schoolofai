import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOAI Creator Resources | Learn, Create & Grow",
  description: "Practical AI courses, proven creator prompts, and free playbooks from the School of AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
