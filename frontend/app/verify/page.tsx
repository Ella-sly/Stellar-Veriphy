"use client";

import { WizardProvider, useWizard } from "@/context/WizardContext";
import { WizardPageShell } from "@/src/features/verification/components/WizardPageShell";
import { useState } from "react";

const STEP_CONFIGS = [
  {
    title: "Select Verification Mode",
    description: "Choose how you want to verify your content",
  },
  {
    title: "Upload Media",
    description: "Select the media file you want to verify",
  },
  {
    title: "Attach Manifest",
    description: "Provide the manifest file with metadata",
  },
  {
    title: "SPV Options",
    description: "Configure verification options",
  },
  {
    title: "Verification Results",
    description: "Review your verification results",
  },
];

function VerifyPageContent() {
  const { currentStep, steps, setStepComplete } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = STEP_CONFIGS[currentStep];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement actual submission logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Select the verification mode for your content.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setStepComplete(0, true)}
                className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-600 dark:border-gray-600 dark:hover:border-blue-500"
              >
                Mode 1: Standard Verification
              </button>
              <button
                onClick={() => setStepComplete(0, true)}
                className="w-full p-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-600 dark:border-gray-600 dark:hover:border-blue-500"
              >
                Mode 2: Advanced Verification
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Upload the media file you want to verify.
            </p>
            <input
              type="file"
              onChange={() => setStepComplete(1, true)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-blue-400"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Attach the manifest file with metadata.
            </p>
            <input
              type="file"
              onChange={() => setStepComplete(2, true)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-blue-400"
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Configure your verification options.
            </p>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                onChange={(e) => setStepComplete(3, e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Enable advanced options
              </span>
            </label>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Your verification is complete. Review the results below.
            </p>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900 dark:border-green-700">
              <p className="text-green-800 dark:text-green-200">
                ✓ Verification successful
              </p>
            </div>
            {/* Mark final step as complete */}
            {!setStepComplete(4, true) && null}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <WizardPageShell
      title={config.title}
      description={config.description}
      onSubmit={handleSubmit}
      isLoading={isSubmitting}
    >
      <div className="space-y-6">
        {renderStepContent()}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>
    </WizardPageShell>
  );
}

export default function VerifyPage() {
  return (
    <WizardProvider>
      <VerifyPageContent />
    </WizardProvider>
  );
}
