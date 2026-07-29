"use client";

import { useWizard } from "@/context/WizardContext";
import { isValidSHA256 } from "@/utils/validation";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdvancedInput() {
  const {
    setAdvancedContentHash,
    setAdvancedManifestHash,
    advancedContentHash,
    advancedManifestHash,
  } = useWizard();
  const [contentHashInput, setContentHashInput] = useState("");
  const [manifestHashInput, setManifestHashInput] = useState("");
  const [contentHashError, setContentHashError] = useState("");
  const [manifestHashError, setManifestHashError] = useState("");
  const router = useRouter();

  const handleContentHashChange = (value: string) => {
    setContentHashInput(value);
    setAdvancedContentHash(value);
    if (value && !isValidSHA256(value)) {
      setContentHashError("Invalid SHA-256 hash format");
    } else {
      setContentHashError("");
    }
  };

  const handleManifestHashChange = (value: string) => {
    setManifestHashInput(value);
    setAdvancedManifestHash(value);
    if (value && !isValidSHA256(value)) {
      setManifestHashError("Invalid SHA-256 hash format");
    } else {
      setManifestHashError("");
    }
  };

  const isValid =
    isValidSHA256(contentHashInput) && isValidSHA256(manifestHashInput);

  const handleContinue = () => {
    if (isValid) {
      router.push("/creator/upload-content/review");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Enter Hashes Manually</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Content Hash (SHA-256)
          </label>
          <input
            type="text"
            value={contentHashInput}
            onChange={(e) => handleContentHashChange(e.target.value)}
            placeholder="64 hexadecimal characters"
            className={`w-full px-4 py-2 border rounded-lg font-mono text-sm ${
              contentHashError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {contentHashError && (
            <p className="text-red-500 text-sm mt-1">{contentHashError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Manifest Hash (SHA-256)
          </label>
          <input
            type="text"
            value={manifestHashInput}
            onChange={(e) => handleManifestHashChange(e.target.value)}
            placeholder="64 hexadecimal characters"
            className={`w-full px-4 py-2 border rounded-lg font-mono text-sm ${
              manifestHashError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {manifestHashError && (
            <p className="text-red-500 text-sm mt-1">{manifestHashError}</p>
          )}
        </div>

        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`w-full py-2 rounded-lg transition ${
            isValid
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
