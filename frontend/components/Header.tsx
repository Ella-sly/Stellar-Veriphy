"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { walletService } from "@/services/wallet";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { connected, publicKey, connect, disconnect } = useWallet();

  const handleWalletClick = async () => {
    if (connected) {
      disconnect();
    } else {
      try {
        await connect();
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/verify", label: "Verify" },
    { href: "/manifest", label: "Manifest" },
    { href: "/builder", label: "Builder" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ⭐ StellarVeriphy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleWalletClick}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all"
            >
              {connected
                ? `${publicKey?.slice(0, 6)}...${publicKey?.slice(-4)}`
                : "Connect Wallet"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-3 pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-gray-300 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                handleWalletClick();
                setMobileMenuOpen(false);
              }}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all"
            >
              {connected
                ? `${publicKey?.slice(0, 6)}...${publicKey?.slice(-4)}`
                : "Connect Wallet"}
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
