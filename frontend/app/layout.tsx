import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { WizardProvider } from "@/app/context/WizardContext";
import { ConsentBanner } from "@/components/ConsentBanner";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import { NotificationProvider } from "@/components/notifications";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { HelpSearchOverlay } from "@/components/ui/HelpSearchOverlay";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { TutorialOverlay } from "@/components/ui/TutorialOverlay";
import { HelpProvider } from "@/context/HelpContext";
import { WalletProvider } from "@/context/WalletContext";
import { SkipToContentLink } from "@/utils/accessibility";

export const metadata: Metadata = {
  title: "StellarVeriphy",
  description: "Decentralized content verification on the Stellar blockchain",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
  robots: "index, follow",
  themeColor: "#3b82f6",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StellarVeriphy",
  },
  other: {
    "darkreader-lock": "true",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="ios-full-height">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans safe-inset`}>
        <SkipToContentLink />
        <ThemeProvider>
          <WalletProvider>
            <NotificationProvider>
              <WizardProvider>
                <HelpProvider>
                  <KeyboardShortcutsProvider>
                    <ToastProvider>
                      {children}
                      <ScrollToTop />
                      <HelpSearchOverlay />
                      <TutorialOverlay />
                      <PWAInstallPrompt />
                      <PWAUpdatePrompt />
                      <ConsentBanner />
                    </ToastProvider>
                  </KeyboardShortcutsProvider>
                </HelpProvider>
              </WizardProvider>
            </NotificationProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}