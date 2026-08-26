"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useHelp } from "@/context/HelpContext";
import { cn } from "@/utils/cn";

export function TutorialOverlay() {
  const {
    isTutorialActive,
    currentTutorialStep,
    tutorialSteps,
    nextTutorialStep,
    prevTutorialStep,
    endTutorial,
    markTutorialSeen,
  } = useHelp();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = tutorialSteps[currentTutorialStep];

  useEffect(() => {
    if (!step || !isTutorialActive) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
    const observer = new ResizeObserver(() => {
      const updated = document.querySelector(step.target);
      if (updated) setTargetRect(updated.getBoundingClientRect());
    });
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [step, isTutorialActive]);

  const isFirst = currentTutorialStep === 0;
  const isLast = currentTutorialStep === tutorialSteps.length - 1;

  const tooltipStyle = useMemo(() => {
    if (!targetRect || !step) return {};
    const gap = 12;
    switch (step.position || "bottom") {
      case "top":
        return {
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.top - gap,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          left: targetRect.left + targetRect.width / 2,
          top: targetRect.bottom + gap,
          transform: "translate(-50%, 0)",
        };
      case "left":
        return {
          left: targetRect.left - gap,
          top: targetRect.top + targetRect.height / 2,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          left: targetRect.right + gap,
          top: targetRect.top + targetRect.height / 2,
          transform: "translate(0, -50%)",
        };
      default:
        return {};
    }
  }, [targetRect, step]);

  const handleFinish = () => {
    markTutorialSeen();
    endTutorial();
  };

  if (!isTutorialActive || !step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300]">
      <div className="absolute inset-0 bg-black/60" onClick={endTutorial} />
      {targetRect && (
        <div
          className="absolute border-2 border-blue-400 rounded-lg pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}
      <div
        className="absolute z-10 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 animate-in fade-in zoom-in-95 duration-200"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{step.title}</span>
          <span className="text-[10px] text-gray-400">
            {currentTutorialStep + 1} / {tutorialSteps.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{step.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {tutorialSteps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === currentTutorialStep ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prevTutorialStep}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleFinish}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Got it
              </button>
            ) : (
              <button
                onClick={nextTutorialStep}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            )}
            <button
              onClick={handleFinish}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
