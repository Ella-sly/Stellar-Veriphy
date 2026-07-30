"use client";

import { useWizard } from "@/context/WizardContext";
import { useRouter } from "next/navigation";

export function ModeSelection() {
  const { setMode } = useWizard();
  const router = useRouter();

  const handleModeSelect = (mode: "standard" | "advanced") => {
    setMode(mode);
    router.push("/creator/upload-content/media-input");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Select Verification Mode</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => handleModeSelect("standard")}
          className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
        >
          <h3 className="text-xl font-semibold mb-2">Standard Mode</h3>
          <p className="text-gray-600">
            Upload your media file and we'll compute the hash for you.
          </p>
        </button>
        <button
          onClick={() => handleModeSelect("advanced")}
          className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
        >
          <h3 className="text-xl font-semibold mb-2">Advanced Mode</h3>
          <p className="text-gray-600">
            Manually enter content and manifest hashes for verification.
          </p>
        </button>
      </div>
    </div>
  );
}
