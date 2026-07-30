"use client";

import { useState } from "react";
import { ContentManifest } from "@stellar-veriphy/shared/types";
import { ManifestModal } from "./ManifestModal";

interface ManifestModalTriggerProps {
  manifest: ContentManifest;
  label?: string;
}

export function ManifestModalTrigger({
  manifest,
  label = "View Manifest",
}: ManifestModalTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
      >
        {label}
      </button>
      <ManifestModal
        manifest={manifest}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
