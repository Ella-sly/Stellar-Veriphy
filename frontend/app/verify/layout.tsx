import type { Metadata } from "next";

const TITLE = "Verify Content";
const DESCRIPTION =
  "Upload media and cryptographically verify its authenticity and provenance on the Stellar blockchain.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
