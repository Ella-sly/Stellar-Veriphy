"use client";

import { useState } from "react";
import { ContentManifest } from "@stellarveriphy/shared/types";
import { KeyValueBuilder } from "@/components/KeyValueBuilder";
import { ManifestPreview } from "@/components/ManifestPreview";
import { isValidStellarAddress, downloadJSON, downloadXML } from "@/utils/validation";
import { ALL_TEMPLATES, loadTemplate, type TemplateId } from "@/utils/manifestTemplates";

export default function ManifestPage() {
  const [manifest, setManifest] = useState<Partial<ContentManifest>>({
    contentHash: "",
    creator: "",
    timestamp: new Date().toISOString(),
    metadata: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTemplate, setActiveTemplate] = useState<TemplateId | null>(null);

  const handleChange = (field: keyof ContentManifest, value: any) => {
    setManifest((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTemplateSelect = (templateId: TemplateId) => {
    const templateManifest = loadTemplate(templateId);
    setManifest(templateManifest);
    setActiveTemplate(templateId);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!manifest.contentHash?.trim()) {
      newErrors.contentHash = "Content hash is required";
    }

    if (!manifest.creator?.trim()) {
      newErrors.creator = "Creator address is required";
    } else if (!isValidStellarAddress(manifest.creator)) {
      newErrors.creator = "Invalid Stellar address format";
    }

    if (!manifest.timestamp?.trim()) {
      newErrors.timestamp = "Timestamp is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDownloadJSON = () => {
    if (validateForm()) {
      downloadJSON(manifest, "manifest.json");
    }
  };

  const handleDownloadXML = () => {
    if (validateForm()) {
      downloadXML(manifest, "manifest.xml");
    }
  };

  const handleMetadataChange = (metadata: Record<string, any>) => {
    setManifest((prev) => ({ ...prev, metadata }));
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">
          Manifest Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Build a content manifest interactively with live preview.
        </p>

        {/* Template Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-black dark:text-white">
            Start from a Template
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {ALL_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  activeTemplate === template.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800"
                }`}
              >
                <span className="text-2xl block mb-1">{template.icon}</span>
                <span className="text-sm font-medium text-black dark:text-white block">
                  {template.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1 leading-tight">
                  {template.description}
                </span>
              </button>
            ))}
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Content Hash (SHA-256)
              </label>
              <input
                type="text"
                value={manifest.contentHash || ""}
                onChange={(e) => handleChange("contentHash", e.target.value)}
                placeholder="e.g., a1b2c3d4..."
                className={`w-full px-4 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white ${
                  errors.contentHash ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.contentHash && (
                <p className="text-red-500 text-sm mt-1">{errors.contentHash}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Creator (Stellar Address)
              </label>
              <input
                type="text"
                value={manifest.creator || ""}
                onChange={(e) => handleChange("creator", e.target.value)}
                placeholder="e.g., GBRPYHIL2CI3..."
                className={`w-full px-4 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white ${
                  errors.creator ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.creator && (
                <p className="text-red-500 text-sm mt-1">{errors.creator}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Timestamp (ISO 8601)
              </label>
              <input
                type="datetime-local"
                value={manifest.timestamp?.slice(0, 16) || ""}
                onChange={(e) =>
                  handleChange("timestamp", new Date(e.target.value).toISOString())
                }
                className={`w-full px-4 py-2 border rounded bg-white dark:bg-gray-800 text-black dark:text-white ${
                  errors.timestamp ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              />
              {errors.timestamp && (
                <p className="text-red-500 text-sm mt-1">{errors.timestamp}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white mb-2">
                Custom Metadata
              </label>
              <KeyValueBuilder
                value={manifest.metadata || {}}
                onChange={handleMetadataChange}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadJSON}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
              >
                Download JSON
              </button>
              <button
                onClick={handleDownloadXML}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
              >
                Download XML
              </button>
            </div>

          </div>

          </div>
        </div>
      </div>
    </main>
  );
}
