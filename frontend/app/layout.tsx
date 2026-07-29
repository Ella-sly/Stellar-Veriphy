import type { Metadata } from "next";
import { WalletProvider } from "@/context/WalletContext";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WizardProvider } from "@/app/context/WizardContext";
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
            <WizardProvider>
              <ToastProvider>{children}</ToastProvider>
            </WizardProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
