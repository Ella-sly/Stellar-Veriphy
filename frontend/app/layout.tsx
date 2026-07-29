import type { Metadata } from "next";
import { WalletProvider } from "@/context/WalletContext";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WizardProvider } from "@/app/context/WizardContext";
import { NotificationProvider } from "@/components/notifications";
import { HelpProvider } from "@/context/HelpContext";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import { HelpSearchOverlay } from "@/components/ui/HelpSearchOverlay";
import { TutorialOverlay } from "@/components/ui/TutorialOverlay";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "StellarVeriphy",
  description: "Decentralized content verification on the Stellar blockchain",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
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