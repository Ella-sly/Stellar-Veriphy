"use client";

/**
 * useWizardGuard
 *
 * Redirects the user back to /verify (the first wizard step) if they try to
 * access a later step without having completed the required previous steps.
 *
 * Usage:
 *   // Inside a step-2 page component:
 *   useWizardGuard(2); // requires steps 0 and 1 to be complete
 *
 * The guard runs on mount and whenever `currentStep` or `completedSteps`
 * change, so it also handles the case where the user navigates back and
 * clears a step.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore } from "../store/wizard.store";

/**
 * @param minimumStep - The step index the current page represents.
 *   All steps with index < minimumStep must be marked complete before the
 *   user is allowed to view this page.
 * @param redirectTo - Optional override for the redirect destination.
 *   Defaults to "/verify".
 */
export function useWizardGuard(
  minimumStep: number,
  redirectTo = "/verify"
): void {
  const router = useRouter();
  const completedSteps = useWizardStore((s) => s.completedSteps);

  useEffect(() => {
    // Check that every step before minimumStep has been completed.
    const prerequisitesMet = Array.from(
      { length: minimumStep },
      (_, i) => i
    ).every((i) => completedSteps[i]);

    if (!prerequisitesMet) {
      router.replace(redirectTo);
    }
  }, [completedSteps, minimumStep, redirectTo, router]);
}
