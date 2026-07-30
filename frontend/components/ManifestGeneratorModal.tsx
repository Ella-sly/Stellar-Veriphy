"use client";

import { ContentManifest } from "@stellarveriphy/shared/types";
import { copyToClipboard, downloadJSON } from "@/utils/validation";
import { useState } from "react";

interface ManifestGeneratorModalProps {
  manifest: Partial<ContentManifest>;
  isOpen: boolean;
  onClose: () => void;
}

export function ManifestGeneratorModal({
  manifest,
  isOpen,
  onClose,
}: ManifestGeneratorModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await copyToClipboard(JSON.stringify(manifest, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadJSON(manifest, "manifest.json");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
          Manifest Preview
        </h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-64 text-sm text-black dark:text-white mb-4">
          {JSON.stringify(manifest, null, 2)}
        </pre>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download JSON
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
