"use client";

import { useWizard } from "@/context/WizardContext";
import { hashFile } from "@/utils/hashing";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPreview } from "./MediaPreview";

export function MediaInput() {
  const { setFile, setContentHash, setHashProgress, hashProgress } =
    useWizard();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [hash, setHash] = useState("");
  const router = useRouter();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setFile(file);
    setIsHashing(true);
    setHashProgress(0);

    try {
      const fileHash = await hashFile(file, (progress) => {
        setHashProgress(progress);
      });
      setHash(fileHash);
      setContentHash(fileHash);
    } catch (error) {
      console.error("Error hashing file:", error);
    } finally {
      setIsHashing(false);
    }
  };

  const handleContinue = () => {
    if (hash) {
      router.push("/creator/upload-content/manifest-step");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Upload Media File</h2>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition cursor-pointer"
        >
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <p className="text-lg font-semibold mb-2">
              Drag and drop your file here
            </p>
            <p className="text-gray-600">or click to select a file</p>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Rich media preview (image, video, audio, PDF, etc.) ── */}
          <MediaPreview file={selectedFile} />

          {isHashing && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Computing hash...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${hashProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{Math.round(hashProgress)}%</p>
            </div>
          )}

          {hash && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Content Hash (SHA-256)</p>
              <p className="font-mono text-sm break-all">{hash}</p>
            </div>
          )}

          {hash && (
            <button
              onClick={handleContinue}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
