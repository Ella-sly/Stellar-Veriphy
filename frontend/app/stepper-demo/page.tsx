"use client";

import { useState } from "react";
import { Stepper } from "@/components/ui/Stepper";

const STEPS = ["Upload", "Verify", "Confirm", "Complete"];

export default function StepperDemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "horizontal"
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Stepper Component Demo
        </h1>

        {/* Controls */}
        <div className="mb-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Step: {currentStep + 1}
              </label>
              <input
                type="range"
                min="0"
                max={STEPS.length - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Orientation
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setOrientation("horizontal")}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors",
                    orientation === "horizontal"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                  )}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => setOrientation("vertical")}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors",
                    orientation === "vertical"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                  )}
                >
                  Vertical
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <Stepper
            steps={STEPS}
            currentStep={currentStep}
            orientation={orientation}
          />
        </div>

        {/* Step Content */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {STEPS[currentStep]}
          </h2>
          <p className="text-blue-800 dark:text-blue-200">
            This is step {currentStep + 1} of {STEPS.length}. Use the slider
            above to navigate through the steps.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={currentStep === STEPS.length - 1}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
