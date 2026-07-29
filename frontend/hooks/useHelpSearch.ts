"use client";

import { useCallback, useMemo, useState } from "react";

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  link?: string;
  videoUrl?: string;
}

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "getting-started",
    title: "Getting Started with StellarVeriphy",
    content:
      "Connect your Stellar wallet to begin verifying content on the blockchain. Use the 'Connect Wallet' button in the header.",
    category: "Basics",
    keywords: ["start", "begin", "wallet", "connect", "onboarding"],
    link: "/docs/getting-started",
    videoUrl: "https://www.youtube.com/watch?v=example",
  },
  {
    id: "verify-content",
    title: "How to Verify Content",
    content:
      "Navigate to the Verify page, upload your file, and follow the wizard steps to generate a cryptographic proof of your content.",
    category: "Verification",
    keywords: ["verify", "upload", "file", "proof", "wizard"],
    link: "/docs/verify-content",
  },
  {
    id: "manifest-generator",
    title: "Using the Manifest Generator",
    content:
      "The Manifest Generator helps you create structured metadata for your content. Fill in the fields or use a template.",
    category: "Manifests",
    keywords: ["manifest", "metadata", "template", "generator"],
    link: "/docs/manifest",
  },
  {
    id: "batch-verification",
    title: "Batch Verification",
    content:
      "Upload multiple files at once for batch verification. Drag and drop files or use the file browser.",
    category: "Verification",
    keywords: ["batch", "multiple", "bulk", "drag", "drop"],
    link: "/docs/batch-verification",
  },
  {
    id: "api-keys",
    title: "Managing API Keys",
    content:
      "Generate and manage API keys for programmatic access to verification services.",
    category: "Development",
    keywords: ["api", "key", "token", "developer", "integration"],
    link: "/docs/api-keys",
  },
  {
    id: "comparison-tool",
    title: "Certificate Comparison Tool",
    content:
      "Compare two certificates side by side to see differences in metadata, hashes, and verification status.",
    category: "Tools",
    keywords: ["compare", "diff", "side", "certificate"],
    link: "/docs/comparison",
  },
  {
    id: "timeline-view",
    title: "Certificate History Timeline",
    content:
      "View the complete history of a certificate including creation, transfers, and status changes.",
    category: "Tools",
    keywords: ["history", "timeline", "audit", "log"],
    link: "/docs/timeline",
  },
  {
    id: "hash-calculator",
    title: "Content Hash Calculator",
    content:
      "Calculate SHA-256 hashes for your content to verify integrity before submitting.",
    category: "Tools",
    keywords: ["hash", "sha256", "checksum", "integrity"],
    link: "/docs/hash-calculator",
  },
];

export function useHelpSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return HELP_ARTICLES;
    const q = query.toLowerCase();
    return HELP_ARTICLES.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.content.toLowerCase().includes(q) ||
        article.keywords.some((k) => k.toLowerCase().includes(q)) ||
        article.category.toLowerCase().includes(q)
    );
  }, [query]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  return {
    query,
    setQuery,
    isOpen,
    open,
    close,
    results,
    allArticles: HELP_ARTICLES,
  };
}

export type { HelpArticle };