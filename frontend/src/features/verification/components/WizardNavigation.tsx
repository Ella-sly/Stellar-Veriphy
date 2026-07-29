"use client";

import { useWizard } from "@/context/WizardContext";

interface WizardNavigationProps {
  onSubmit?: () => void | Promise<void>;
  isLoading?: boolean;
}

export function WizardNavigation({ onSubmit, isLoading = false }: WizardNavigationProps) {
  const { currentStep, steps, nextStep, prevStep, reset, isStepComplete } = useWizard();
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const canProceed = isStepComplete(currentStep);

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
    reset();
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={prevStep}
        disabled={isFirstStep}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        Back
      </button>

      {isLastStep ? (
        <button
          onClick={handleSubmit}
          disabled={!canProceed || isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Submitting..." : "Submit"}
        </button>
      ) : (
        <button
          onClick={nextStep}
          disabled={!canProceed}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      )}
    </div>
  );
}
