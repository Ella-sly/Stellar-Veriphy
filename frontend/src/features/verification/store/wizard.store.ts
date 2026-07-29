/**
 * Zustand store for wizard state.
 *
 * Mirrors the shape of WizardState and persists to sessionStorage so that
 * state survives page navigations within the same browser tab but is cleared
 * when the tab is closed.
 *
 * Use this store as a complement to (or replacement for) WizardContext when
 * you need state that outlives a single React subtree.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  FileInfo,
  ManifestData,
  SPVResult,
  VerificationMode,
  WizardState,
} from "../types/wizard.types";

// ─── Action signatures ────────────────────────────────────────────────────────

interface WizardActions {
  /** Move to a specific step by index. */
  setStep: (step: number) => void;
  /** Mark a step as complete or incomplete. */
  setStepComplete: (step: number, complete: boolean) => void;
  /** Set the verification mode. */
  setMode: (mode: VerificationMode) => void;
  /**
   * Store serialisable file metadata.
   * The raw `File` object cannot be persisted; pass `null` to clear.
   */
  setFile: (fileInfo: FileInfo | null) => void;
  /** Store the SHA-256 content hash computed from the uploaded file. */
  setContentHash: (hash: string) => void;
  /** Update the hashing progress (0–100). */
  setHashProgress: (progress: number) => void;
  /** Store the manually entered content hash (advanced mode). */
  setAdvancedContentHash: (hash: string) => void;
  /** Store the manually entered manifest hash (advanced mode). */
  setAdvancedManifestHash: (hash: string) => void;
  /** Store the parsed manifest object. */
  setManifest: (manifest: ManifestData | null) => void;
  /** Store the SHA-256 hash of the manifest file. */
  setManifestHash: (hash: string) => void;
  /** Toggle encryption for the SPV submission. */
  setEncryptionEnabled: (enabled: boolean) => void;
  /** Store the result returned after SPV submission. */
  setSPVResult: (result: SPVResult) => void;
  /** Reset the entire wizard back to its initial state. */
  reset: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const initialState: WizardState = {
  currentStep: 0,
  completedSteps: Array(TOTAL_STEPS).fill(false) as boolean[],
  mode: null,
  fileInfo: null,
  contentHash: "",
  hashProgress: 0,
  advancedContentHash: "",
  advancedManifestHash: "",
  manifest: null,
  manifestHash: "",
  encryptionEnabled: false,
  spvResult: {},
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState & WizardActions>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      setStepComplete: (step, complete) =>
        set((state) => {
          const completedSteps = [...state.completedSteps];
          completedSteps[step] = complete;
          return { completedSteps };
        }),

      setMode: (mode) => set({ mode }),

      setFile: (fileInfo) => set({ fileInfo }),

      setContentHash: (contentHash) => set({ contentHash }),

      setHashProgress: (hashProgress) => set({ hashProgress }),

      setAdvancedContentHash: (advancedContentHash) =>
        set({ advancedContentHash }),

      setAdvancedManifestHash: (advancedManifestHash) =>
        set({ advancedManifestHash }),

      setManifest: (manifest) => set({ manifest }),

      setManifestHash: (manifestHash) => set({ manifestHash }),

      setEncryptionEnabled: (encryptionEnabled) => set({ encryptionEnabled }),

      setSPVResult: (spvResult) => set({ spvResult }),

      reset: () => set(initialState),
    }),
    {
      name: "stellar-veriphy-wizard",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the data fields; transient UI state like hashProgress
      // does not need to survive a navigation.
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        mode: state.mode,
        fileInfo: state.fileInfo,
        contentHash: state.contentHash,
        advancedContentHash: state.advancedContentHash,
        advancedManifestHash: state.advancedManifestHash,
        manifest: state.manifest,
        manifestHash: state.manifestHash,
        encryptionEnabled: state.encryptionEnabled,
        spvResult: state.spvResult,
      }),
    }
  )
);
