"use client";

import { useWallet } from "@/context/WalletContext";
import { FiArrowRight } from "react-icons/fi";

export function HeroSection() {
  const { connect, connected } = useWallet();

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          ⭐ StellarVeriphy
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          The Truth Engine for the Stellar Ecosystem
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
          Decentralized digital content verification and provenance on the
          Stellar blockchain. Cryptographically prove the authenticity and
          origin of any digital asset.
        </p>
        <button
          onClick={connect}
          disabled={connected}
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 disabled:hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
        >
          {connected ? "Wallet Connected" : "Connect Wallet"}
          <FiArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
