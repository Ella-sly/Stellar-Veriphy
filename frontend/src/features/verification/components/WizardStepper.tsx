"use client";

import { useWizard } from "@/context/WizardContext";

const STEP_LABELS = ["Mode", "Media", "Manifest", "Options", "Results"];

export function WizardStepper() {
  const { currentStep, steps } = useWizard();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      {STEP_LABELS.map((label, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
              index <= currentStep
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {index + 1}
          </div>
          <span
            className={`ml-2 text-sm font-medium ${
              index <= currentStep
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {label}
          </span>
          {index < STEP_LABELS.length - 1 && (
            <div
              className={`mx-4 h-1 flex-1 transition-colors ${
                index < currentStep
                  ? "bg-blue-600"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
              style={{ minWidth: "40px" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
