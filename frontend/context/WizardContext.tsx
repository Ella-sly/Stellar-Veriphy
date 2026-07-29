"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type {
  VerificationMode,
  FileInfo,
  ManifestData,
} from "@/src/features/verification/types/wizard.types";

// Re-export so existing imports of VerificationMode from this file keep working.
export type { VerificationMode };

interface WizardContextValue {
  mode: VerificationMode | null;
  setMode: (mode: VerificationMode) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  fileInfo: FileInfo | null;
  contentHash: string;
  setContentHash: (hash: string) => void;
  advancedContentHash: string;
  setAdvancedContentHash: (hash: string) => void;
  advancedManifestHash: string;
  setAdvancedManifestHash: (hash: string) => void;
  manifest: ManifestData | null;
  setManifest: (manifest: ManifestData | null) => void;
  manifestHash: string;
  setManifestHash: (hash: string) => void;
  hashProgress: number;
  setHashProgress: (progress: number) => void;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<VerificationMode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [contentHash, setContentHash] = useState("");
  const [advancedContentHash, setAdvancedContentHash] = useState("");
  const [advancedManifestHash, setAdvancedManifestHash] = useState("");
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [manifestHash, setManifestHash] = useState("");
  const [hashProgress, setHashProgress] = useState(0);

  // Derive a serialisable FileInfo from the raw File object.
  const fileInfo: FileInfo | null = file
    ? { name: file.name, size: file.size, type: file.type }
    : null;

  return (
    <WizardContext.Provider
      value={{
        mode,
        setMode,
        file,
        setFile,
        fileInfo,
        contentHash,
        setContentHash,
        advancedContentHash,
        setAdvancedContentHash,
        advancedManifestHash,
        setAdvancedManifestHash,
        manifest,
        setManifest,
        manifestHash,
        setManifestHash,
        hashProgress,
        setHashProgress,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within WizardProvider");
  }
  return context;
}
