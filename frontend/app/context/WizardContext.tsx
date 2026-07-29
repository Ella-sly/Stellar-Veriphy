"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type {
  ManifestData,
  SPVResult,
} from "@/src/features/verification/types/wizard.types";

interface WizardContextValue {
  manifest: ManifestData;
  setManifest: (manifest: ManifestData) => void;
  encryptionEnabled: boolean;
  setEncryptionEnabled: (enabled: boolean) => void;
  spvResult: SPVResult;
  setSPVResult: (result: SPVResult) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue>({
  manifest: {},
  setManifest: () => {},
  encryptionEnabled: false,
  setEncryptionEnabled: () => {},
  spvResult: {},
  setSPVResult: () => {},
  reset: () => {},
});

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = useState<ManifestData>({});
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [spvResult, setSPVResult] = useState<SPVResult>({});

  const reset = useCallback(() => {
    setManifest({});
    setEncryptionEnabled(false);
    setSPVResult({});
  }, []);

  return (
    <WizardContext.Provider
      value={{
        manifest,
        setManifest,
        encryptionEnabled,
        setEncryptionEnabled,
        spvResult,
        setSPVResult,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export const useWizard = () => useContext(WizardContext);
