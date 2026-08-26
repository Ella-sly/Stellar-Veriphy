import type { Metadata } from "next";

const TITLE = "Transaction History";
const DESCRIPTION =
  "Browse, filter, and inspect blockchain transactions for your certificates and verifications.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
