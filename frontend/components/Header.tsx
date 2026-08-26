"use client";

import Link from "next/link";
import { useEffect,useRef, useState } from "react";

import { NotificationBell } from "@/components/notifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { useHelp } from "@/context/HelpContext";
import { useWallet } from "@/context/WalletContext";
import { walletService } from "@/services/wallet";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { connected, publicKey, connect, disconnect } = useWallet();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

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

  // Handle keyboard navigation for mobile menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!mobileMenuOpen) return;

      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }

      if (event.key === 'Tab' && mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement && lastElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement && firstElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10"
      role="banner"
      aria-label="Main navigation"
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
        aria-label="Primary navigation"
      >
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
          <div
            className="hidden md:flex items-center gap-4"
            role="group"
            aria-label="User actions"
          >
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={handleWalletClick}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black focus:scale-105 min-h-[44px] min-w-[44px]"
              aria-label={connected ? "Disconnect wallet" : "Connect wallet"}
              aria-pressed={connected}
            >
              {connected
                ? `${publicKey?.slice(0, 6)}...${publicKey?.slice(-4)}`
                : "Connect Wallet"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            ref={mobileMenuButtonRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded min-h-[44px] min-w-[44px]"
            aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-haspopup="true"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          role="menu"
          aria-label="Mobile navigation"
          aria-hidden={!mobileMenuOpen}
          className={`md:hidden transition-all duration-200 ease-in-out ${mobileMenuOpen
            ? "mt-4 space-y-3 pb-4 opacity-100 visible"
            : "h-0 opacity-0 invisible"
            }`}
        >
          {mobileMenuOpen && (
            <>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-gray-300 hover:text-white transition-colors py-2 focus:outline-none focus:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded px-2 min-h-[44px] flex items-center"
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-300">Theme</span>
                <ThemeToggle />
              </div>
              <button
                onClick={() => {
                  handleWalletClick();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black focus:scale-105 min-h-[44px]"
                role="menuitem"
                tabIndex={mobileMenuOpen ? 0 : -1}
                aria-label={connected ? "Disconnect wallet" : "Connect wallet"}
              >
                {connected
                  ? `${publicKey?.slice(0, 6)}...${publicKey?.slice(-4)}`
                  : "Connect Wallet"}
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
