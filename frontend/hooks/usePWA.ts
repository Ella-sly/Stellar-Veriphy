/**
 * usePWA.ts
 * React hook for PWA functionality
 */

import { useEffect, useState } from "react";
import { registerServiceWorker, isPWAInstalled, isOnline } from "@/lib/pwa";

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnlineStatus, setIsOnlineStatus] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if installed
    setIsInstalled(isPWAInstalled());
    setIsOnlineStatus(isOnline());

    // Register service worker
    registerServiceWorker().then((reg) => {
      setRegistration(reg);
    });

    // Listen for online/offline
    const handleOnline = () => setIsOnlineStatus(true);
    const handleOffline = () => setIsOnlineStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isInstalled,
    isOnline: isOnlineStatus,
    registration,
  };
}
