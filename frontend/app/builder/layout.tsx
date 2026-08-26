import type { Metadata } from "next";

const TITLE = "Manifest Builder";
const DESCRIPTION =
  "Build a compliant C2PA and Stellar metadata manifest for your content, field by field.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
