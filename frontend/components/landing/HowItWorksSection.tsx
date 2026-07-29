"use client";

export function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Upload Content",
      description: "Submit your digital asset and metadata to the platform",
    },
    {
      number: "2",
      title: "Verification",
      description: "TEE-backed oracle verifies the content and metadata",
    },
    {
      number: "3",
      title: "On-Chain Record",
      description: "Provenance certificate is minted on Stellar blockchain",
    },
    {
      number: "4",
      title: "Audit & Verify",
      description: "Anyone can verify the certificate without central authority",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 px-4 bg-slate-900 scroll-mt-20"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="bg-slate-800 p-6 rounded-lg">
              <div className="text-3xl font-bold text-blue-500 mb-3">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
