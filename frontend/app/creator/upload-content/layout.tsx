"use client";

import { WizardProvider } from "@/context/WizardContext";

export default function UploadContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WizardProvider>
      <main className="max-w-2xl mx-auto py-12 px-4">{children}</main>
    </WizardProvider>
  );
}
