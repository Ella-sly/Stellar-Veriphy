"use client";

import { ContentManifest } from "@stellarveriphy/shared/types";

interface ManifestPreviewProps {
  manifest: Partial<ContentManifest>;
}

export function ManifestPreview({ manifest }: ManifestPreviewProps) {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700">
      <h3 className="font-semibold mb-3 text-black dark:text-white">Preview</h3>
      <pre className="text-sm overflow-auto max-h-64 text-black dark:text-white">
        {JSON.stringify(manifest, null, 2)}
      </pre>
    </div>
  );
}
