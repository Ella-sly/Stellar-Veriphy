"use client";

export function AboutSection() {
  return (
    <section
      id="about"
      className="py-20 px-4 bg-slate-800 scroll-mt-20"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-white mb-8 text-center">
          About StellarVeriphy
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-700 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">
              What is Verification?
            </h3>
            <p className="text-gray-300">
              Given a piece of media and metadata claiming its origin, we provide
              cryptographic evidence that the content has not been altered and
              corresponds to the claimed metadata.
            </p>
          </div>
          <div className="bg-slate-700 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-white mb-4">
              Immutable Records
            </h3>
            <p className="text-gray-300">
              All verification results are recorded on-chain using Soroban smart
              contracts, enabling third-party audit without trusting a central
              authority.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
