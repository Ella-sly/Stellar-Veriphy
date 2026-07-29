"use client";

export function Header() {
  return (
    <header className="fixed top-0 w-full bg-slate-900/95 backdrop-blur border-b border-slate-700 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-white">⭐ StellarVeriphy</div>
        <nav className="hidden md:flex gap-8">
          <a href="#about" className="text-gray-300 hover:text-white transition">
            About
          </a>
          <a href="#how-it-works" className="text-gray-300 hover:text-white transition">
            How It Works
          </a>
          <a href="#ecosystem" className="text-gray-300 hover:text-white transition">
            Ecosystem
          </a>
        </nav>
      </div>
    </header>
  );
}
