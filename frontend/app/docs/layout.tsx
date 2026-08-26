import type { Metadata } from "next";

const TITLE = "API Documentation";
const DESCRIPTION = "Interactive OpenAPI reference for the StellarVeriphy verification API.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
