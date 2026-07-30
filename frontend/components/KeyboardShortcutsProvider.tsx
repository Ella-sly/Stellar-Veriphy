"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHelp } from "@/context/HelpContext";
import {
  useKeyboardShortcuts,
  type ShortcutAction,
} from "@/hooks/useKeyboardShortcuts";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ShortcutHelpModal } from "@/components/ui/ShortcutHelpModal";

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { openHelpSearch, hasSeenTutorial, startTutorial, markTutorialSeen } =
    useHelp();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const shortcuts: ShortcutAction[] = useMemo(
    () => [
      {
        id: "command-palette",
        label: "Open Command Palette",
        keys: ["ctrl+k", "control+k"],
        macKeys: ["cmd+k"],
        handler: () => setShowCommandPalette(true),
        category: "General",
      },
      {
        id: "shortcut-help",
        label: "Show Keyboard Shortcuts",
        keys: ["ctrl+?", "control+/"],
        macKeys: ["cmd+?"],
        handler: () => setShowShortcutHelp(true),
        category: "General",
      },
      {
        id: "help-search",
        label: "Open Help Search",
        keys: ["ctrl+h", "control+h"],
        macKeys: ["cmd+h"],
        handler: () => openHelpSearch(),
        category: "General",
      },
      {
        id: "go-home",
        label: "Go to Home",
        keys: ["ctrl+shift+h", "control+shift+h"],
        macKeys: ["cmd+shift+h"],
        handler: () => router.push("/"),
        category: "Navigation",
      },
      {
        id: "go-verify",
        label: "Go to Verify",
        keys: ["ctrl+shift+v", "control+shift+v"],
        macKeys: ["cmd+shift+v"],
        handler: () => router.push("/verify"),
        category: "Navigation",
      },
      {
        id: "go-manifest",
        label: "Go to Manifest",
        keys: ["ctrl+shift+m", "control+shift+m"],
        macKeys: ["cmd+shift+m"],
        handler: () => router.push("/manifest"),
        category: "Navigation",
      },
      {
        id: "go-tools",
        label: "Go to Tools",
        keys: ["ctrl+shift+t", "control+shift+t"],
        macKeys: ["cmd+shift+t"],
        handler: () => router.push("/tools"),
        category: "Navigation",
      },
    ],
    [router, openHelpSearch]
  );

  const { getDisplayKeys } = useKeyboardShortcuts({ shortcuts });

  const commandPaletteCommands = useMemo(
    () => [
      ...shortcuts.map((s) => ({
        id: s.id,
        label: s.label,
        category: s.category,
        shortcut: getDisplayKeys(s).join("+"),
        action: s.handler,
      })),
      {
        id: "start-tutorial",
        label: "Start Onboarding Tutorial",
        category: "Help",
        action: () => {
          markTutorialSeen();
          startTutorial();
        },
      },
    ],
    [shortcuts, getDisplayKeys, markTutorialSeen, startTutorial]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tutorial") === "1" && !hasSeenTutorial) {
      startTutorial();
    }
  }, [hasSeenTutorial, startTutorial]);

  return (
    <>
      {children}
      <CommandPalette
        commands={commandPaletteCommands}
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
      <ShortcutHelpModal
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
        shortcuts={shortcuts}
        getDisplayKeys={getDisplayKeys}
      />
    </>
  );
}