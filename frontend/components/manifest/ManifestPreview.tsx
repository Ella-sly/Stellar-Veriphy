"use client";

import { useEffect, useRef, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";
import { FiCopy, FiCheck } from "react-icons/fi";

interface ManifestPreviewProps {
  content: string;
  format: "json" | "xml";
}

export function ManifestPreview({ content, format }: ManifestPreviewProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [content, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const language = format === "json" ? "json" : "markup";

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors z-10"
        title="Copy to clipboard"
      >
        {copied ? (
          <FiCheck className="w-4 h-4 text-green-400" />
        ) : (
          <FiCopy className="w-4 h-4 text-gray-300" />
        )}
      </button>
      <pre className="p-4 overflow-auto max-h-96">
        <code ref={codeRef} className={`language-${language}`}>
          {content}
        </code>
      </pre>
    </div>
  );
}
