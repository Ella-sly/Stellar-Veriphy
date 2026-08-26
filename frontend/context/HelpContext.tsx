"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { type HelpArticle,useHelpSearch } from "@/hooks/useHelpSearch";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useHelpSearch, type HelpArticle } from "@/hooks/useHelpSearch";

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface HelpContextValue {
  showHelpSearch: boolean;
  openHelpSearch: () => void;
  closeHelpSearch: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: HelpArticle[];
  isTutorialActive: boolean;
  currentTutorialStep: number;
  tutorialSteps: TutorialStep[];
  startTutorial: (steps?: TutorialStep[]) => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  endTutorial: () => void;
  hasSeenTutorial: boolean;
  markTutorialSeen: () => void;
}

const HelpContext = createContext<HelpContextValue>({
  showHelpSearch: false,
  openHelpSearch: () => {},
  closeHelpSearch: () => {},
  searchQuery: "",
  setSearchQuery: () => {},
  searchResults: [],
  isTutorialActive: false,
  currentTutorialStep: 0,
  tutorialSteps: [],
  startTutorial: () => {},
  nextTutorialStep: () => {},
  prevTutorialStep: () => {},
  endTutorial: () => {},
  hasSeenTutorial: false,
  markTutorialSeen: () => {},
});

const TUTORIAL_SEEN_KEY = "sv-tutorial-seen";

const ONBOARDING_TUTORIAL: TutorialStep[] = [
  {
    target: "[data-tutorial='header']",
    title: "Welcome to StellarVeriphy",
    content: "Your decentralized content verification platform on the Stellar blockchain.",
    position: "bottom",
  },
  {
    target: "[data-tutorial='wallet']",
    title: "Connect Your Wallet",
    content: "Connect your Stellar wallet to start verifying and managing certificates.",
    position: "bottom",
  },
  {
    target: "[data-tutorial='nav-verify']",
    title: "Verify Content",
    content: "Upload content and generate cryptographic proofs of authenticity.",
    position: "bottom",
  },
  {
    target: "[data-tutorial='nav-manifest']",
    title: "Create Manifests",
    content: "Generate structured metadata manifests for your verified content.",
    position: "bottom",
  },
  {
    target: "[data-tutorial='nav-tools']",
    title: "Explore Tools",
    content: "Access additional tools like batch verification, comparison, and hash calculation.",
    position: "bottom",
  },
];

export function HelpProvider({ children }: { children: ReactNode }) {
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    isOpen: showHelpSearch,
    open: openHelpSearch,
    close: closeHelpSearch,
    results: searchResults,
  } = useHelpSearch();

  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([]);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";
  });

  const startTutorial = useCallback((steps: TutorialStep[] = ONBOARDING_TUTORIAL) => {
    setTutorialSteps(steps);
    setCurrentTutorialStep(0);
  }, []);

  const nextTutorialStep = useCallback(() => {
    setCurrentTutorialStep((prev) => (prev < tutorialSteps.length - 1 ? prev + 1 : prev));
  }, [tutorialSteps.length]);

  const prevTutorialStep = useCallback(() => {
    setCurrentTutorialStep((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const endTutorial = useCallback(() => {
    setTutorialSteps([]);
    setCurrentTutorialStep(0);
  }, []);

  const markTutorialSeen = useCallback(() => {
    setHasSeenTutorial(true);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    } catch {
      /* noop */
    }
  }, []);

  return (
    <HelpContext.Provider
      value={{
        showHelpSearch,
        openHelpSearch,
        closeHelpSearch,
        searchQuery,
        setSearchQuery,
        searchResults,
        isTutorialActive: tutorialSteps.length > 0,
        currentTutorialStep,
        tutorialSteps,
        startTutorial,
        nextTutorialStep,
        prevTutorialStep,
        endTutorial,
        hasSeenTutorial,
        markTutorialSeen,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export const useHelp = () => useContext(HelpContext);
export { ONBOARDING_TUTORIAL };
export type { TutorialStep };
