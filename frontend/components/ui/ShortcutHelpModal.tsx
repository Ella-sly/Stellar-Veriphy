"use client";

import { useMemo } from "react";

import { Modal } from "@/components/ui/Modal";
import { type ShortcutAction } from "@/hooks/useKeyboardShortcuts";

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutAction[];
  getDisplayKeys: (action: ShortcutAction) => string[];
}

export function ShortcutHelpModal({
  isOpen,
  onClose,
  shortcuts,
  getDisplayKeys,
}: ShortcutHelpModalProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, ShortcutAction[]> = {};
    for (const s of shortcuts) {
      if (!groups[s.category]) groups[s.category] = [];
      (groups[s.category] as ShortcutAction[]).push(s);
    }
    return groups;
  }, [shortcuts]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, actions]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              {category}
            </h3>
            <div className="space-y-1">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {action.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {getDisplayKeys(action).map((key, i) => (
                      <span key={i}>
                        {i > 0 && (
                          <span className="text-gray-400 mx-0.5 text-xs">
                            +
                          </span>
                        )}
                        <kbd className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
          Customize shortcuts by pressing a keyboard combination after clicking
          the shortcut in the settings panel.
        </p>
      </div>
    </Modal>
  );
}