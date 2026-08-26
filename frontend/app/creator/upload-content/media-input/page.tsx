"use client";

import { useWizard } from "@/context/WizardContext";
import { AdvancedInput,MediaInput } from "@/features/verification/components/steps";

export default function MediaInputPage() {
  const { mode } = useWizard();

  if (mode === "advanced") {
    return <AdvancedInput />;
  }

  return <MediaInput />;
}
