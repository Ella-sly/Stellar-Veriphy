import type { Metadata } from "next";

const TITLE = "Certificate Comparison";
const DESCRIPTION =
  "Compare provenance certificates side-by-side to spot differences and tampering.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ComparisonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
