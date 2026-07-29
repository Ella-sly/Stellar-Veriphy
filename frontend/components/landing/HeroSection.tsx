"use client";

import { useWallet } from "@/context/WalletContext";
import { FiArrowRight } from "react-icons/fi";

export function HeroSection() {
  const { connect, connected } = useWallet();

  return (
    <section 
      className="min-h-[100svh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12"
      aria-label="Hero section"
    >
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
          <span className="sr-only">StellarVeriphy</span>
          <span aria-hidden="true">⭐ StellarVeriphy</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
          The Truth Engine for the Stellar Ecosystem
        </p>
        <p className="text-base sm:text-lg text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto px-2 sm:px-0 leading-relaxed">
          Decentralized digital content verification and provenance on the
          Stellar blockchain. Cryptographically prove the authenticity and
          origin of any digital asset.
        </p>
        <button
          onClick={connect}
          disabled={connected}
          className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 disabled:hover:bg-green-600 text-white font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900 focus:scale-105 active:scale-95 min-h-[44px] sm:min-h-[48px] min-w-[44px] text-base sm:text-lg"
          aria-label={connected ? "Wallet is connected" : "Connect wallet to start"}
          aria-disabled={connected}
        >
          {connected ? "Wallet Connected" : "Connect Wallet"}
          <FiArrowRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
        </button>
        
        {/* Decorative background elements for different screen sizes */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-80 sm:h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </section>
  );
}
