"use client";

import { useState } from "react";
import { KeyValueBuilder } from "@/components/KeyValueBuilder";
import { ManifestGeneratorModal } from "@/components/ManifestGeneratorModal";
import { copyToClipboard } from "@/utils/validation";

export default function BuilderPage() {
  const [manifest, setManifest] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    await copyToClipboard(JSON.stringify(manifest, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">
          Advanced Manifest Builder
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Construct manifests with full control over the schema, including nested objects
          and arrays.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                Build Your Manifest
              </h2>
              <KeyValueBuilder value={manifest} onChange={setManifest} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
              >
                Preview & Export
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
              <button
                onClick={handleDownloadJSON}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
              >
                Download JSON
              </button>
            </div>
          </div>

          <div>
            <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700 sticky top-6">
              <h3 className="font-semibold mb-3 text-black dark:text-white">
                Live Preview
              </h3>
              <pre className="text-sm overflow-auto max-h-96 text-black dark:text-white">
                {JSON.stringify(manifest, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <ManifestGeneratorModal
        manifest={manifest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
