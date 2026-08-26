import {
  ArrowRight,
  BookOpen,
  Compass,
  FileCode,
  Home,
  Layers,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function NotFound() {
  const popularPages = [
    {
      title: "Verify Content",
      description: "Upload media files and cryptographically verify provenance on Stellar.",
      href: "/verify",
      icon: ShieldCheck,
      badge: "Core Feature",
    },
    {
      title: "Manifest Builder",
      description: "Generate compliant C2PA and Stellar metadata manifests.",
      href: "/builder",
      icon: FileCode,
      badge: "Creator Tool",
    },
    {
      title: "Batch Verification",
      description: "Verify multiple assets and manifests simultaneously.",
      href: "/batch-verification",
      icon: Layers,
      badge: "Bulk",
    },
    {
      title: "Certificate Comparison",
      description: "Compare provenance certificates side-by-side.",
      href: "/comparison",
      icon: Search,
      badge: "Inspection",
    },
    {
      title: "Developer Tools",
      description: "Explore hash calculators, signature verifiers, and API keys.",
      href: "/tools",
      icon: Compass,
      badge: "Dev Suite",
    },
    {
      title: "Documentation",
      description: "Read architecture guides, Soroban contract specs, and tutorials.",
      href: "/docs",
      icon: BookOpen,
      badge: "Guides",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 selection:bg-blue-500 selection:text-white">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Fun Cosmic Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium animate-pulse">
            <span className="text-base">🚀</span>
            <span>Ledger Sequence Error • Status 404</span>
          </div>

          {/* Glowing 404 Headline */}
          <div className="relative">
            <div className="text-8xl sm:text-9xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-500 bg-clip-text text-transparent select-none drop-shadow-sm">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center blur-3xl opacity-20 bg-blue-500 pointer-events-none -z-10" />
          </div>

          {/* Creative Title & Description */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Lost in the Stellar Cosmos
            </h1>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
              We queried the entire distributed ledger across the galaxy, but this block seems to
              have drifted into an uncharted wormhole or was never minted on-chain.
            </p>
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 min-h-[48px]"
            >
              <Home className="w-5 h-5" />
              <span>Return to Base (Home)</span>
            </Link>

            <Link
              href="/verify"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[48px]"
            >
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Verify an Asset</span>
            </Link>
          </div>

          {/* Popular Destinations Grid */}
          <div className="pt-12 text-left">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Popular Destinations
              </h2>
              <span className="text-xs text-slate-500">Pick a safe coordinates below</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularPages.map((page) => {
                const IconComponent = page.icon;
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="group relative p-5 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                          {page.badge}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {page.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        {page.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center text-xs font-medium text-blue-400 group-hover:text-blue-300">
                      <span>Navigate</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
