import type { Metadata } from "next";

const TITLE = "Manifest Editor";
const DESCRIPTION =
  "Create, preview, and export content provenance manifests with templates and auto-save.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ManifestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
