"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Product */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <a href="#verify" className="hover:text-white transition">
                  Verify
                </a>
              </li>
              <li>
                <a href="#manifest" className="hover:text-white transition">
                  Manifest
                </a>
              </li>
              <li>
                <a href="#builder" className="hover:text-white transition">
                  Builder
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#docs" className="hover:text-white transition">
                  Docs
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Stellar-Veriphy/Stellar-Veriphy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a href="#contributing" className="hover:text-white transition">
                  Contributing
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#license" className="hover:text-white transition">
                  License
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 text-center text-sm">
          <p>&copy; {currentYear} StellarVeriphy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
