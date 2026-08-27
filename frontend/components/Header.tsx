"use client";

import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { NotificationBell } from "@/components/notifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWallet } from "@/context/WalletContext";

export function Header() {
  const { connected, publicKey, connect, disconnect } = useWallet();

  const handleWalletClick = async () => {
    if (connected) {
      disconnect();
    } else {
      try {
        await connect("freighter");
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
    { href: "/transactions", label: "Transactions" },
    { href: "/tools", label: "Tools" },
  ];

  const quickActions = [
    { href: "/verify", label: "Verify", icon: "🔍" },
    { href: "/builder", label: "Build", icon: "🔨" },
  ];

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10"
      role="banner"
      aria-label="Main navigation"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" aria-label="Primary navigation">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded"
            aria-label="StellarVeriphy - Home"
          >
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ⭐ StellarVeriphy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div
            className="hidden md:flex items-center gap-8"
            role="navigation"
            aria-label="Desktop navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1"
                aria-label={`Navigate to ${link.label}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4" role="group" aria-label="User actions">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={handleWalletClick}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black focus:scale-105 min-h-[44px] min-w-[44px]"
              aria-label={connected ? "Disconnect wallet" : "Connect wallet"}
              aria-pressed={connected}
            >
              {connected ? `${publicKey?.slice(0, 6)}...${publicKey?.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <MobileNav links={navLinks} quickActions={quickActions} />
        </div>
      </nav>
    </header>
  );
}
