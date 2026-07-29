"use client";

import { cn } from "@/utils/cn";

interface StepperProps {
  steps: string[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}: StepperProps) {
  return (
    <div
      className={cn(
        orientation === "horizontal"
          ? "flex items-center justify-between"
          : "flex flex-col gap-8",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isFuture = index > currentStep;

        return (
          <div
            key={index}
            className={cn(
              "flex items-center",
              orientation === "horizontal" && "flex-1",
              orientation === "vertical" && "w-full"
            )}
          >
            {/* Step Circle */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  isCompleted &&
                    "bg-green-500 text-white",
                  isActive &&
                    "bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900",
                  isFuture &&
                    "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                )}
              >
                {isCompleted ? (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <p
                className={cn(
                  "mt-2 text-sm font-medium text-center",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isActive && "text-blue-600 dark:text-blue-400",
                  isFuture && "text-gray-500 dark:text-gray-400"
                )}
              >
                {step}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "transition-all",
                  orientation === "horizontal"
                    ? "flex-1 h-1 mx-2"
                    : "w-1 h-8 mx-auto",
                  index < currentStep
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
