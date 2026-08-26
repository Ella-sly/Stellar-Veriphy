/**
 * pwa.ts
 *
 * PWA utilities for service worker registration, push notifications,
 * and offline support.
 */

// Service Worker Registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("Service Worker not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("Service Worker registered:", registration.scope);

    // Check for updates periodically
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000
    ); // Check every hour

    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

// Unregister Service Worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log("Service Worker unregistered:", success);
    return success;
  } catch (error) {
    console.error("Service Worker unregistration failed:", error);
    return false;
  }
}

// Push Notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("Notifications not supported");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export async function subscribeToPushNotifications(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const permission = await requestNotificationPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });

    console.log("Push subscription created:", subscription);
    return subscription;
  } catch (error) {
    console.error("Push subscription failed:", error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return false;
    }

    const success = await subscription.unsubscribe();
    console.log("Push unsubscribed:", success);
    return success;
  } catch (error) {
    console.error("Push unsubscribe failed:", error);
    return false;
  }
}

// Offline Status
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export function addOnlineListener(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}

export function addOfflineListener(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("offline", callback);
  return () => window.removeEventListener("offline", callback);
}

// Cache Management
export async function clearAllCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log("All caches cleared");
}

export async function getCacheSize(): Promise<number> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return 0;
  }

  let totalSize = 0;
  const cacheNames = await caches.keys();

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

// Install Status
export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function getPWADisplayMode(): string {
  if (typeof window === "undefined") return "browser";

  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    return "fullscreen";
  }
  if (window.matchMedia("(display-mode: minimal-ui)").matches) {
    return "minimal-ui";
  }
  return "browser";
}

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Background Sync
export async function registerBackgroundSync(
  registration: ServiceWorkerRegistration,
  tag: string
): Promise<void> {
  if (!("sync" in registration)) {
    console.log("Background Sync not supported");
    return;
  }

  try {
    await (
      registration as unknown as { sync: { register(t: string): Promise<void> } }
    ).sync.register(tag);
    console.log("Background sync registered:", tag);
  } catch (error) {
    console.error("Background sync registration failed:", error);
  }
}

// App Badge API
export function setAppBadge(count: number): void {
  if (typeof window === "undefined" || !("setAppBadge" in navigator)) {
    return;
  }

  const nav = navigator as unknown as {
    setAppBadge(c: number): Promise<void>;
    clearAppBadge(): Promise<void>;
  };
  if (count > 0) {
    nav.setAppBadge(count);
  } else {
    nav.clearAppBadge();
  }
}

export function clearAppBadge(): void {
  if (typeof window === "undefined" || !("clearAppBadge" in navigator)) {
    return;
  }

  const nav = navigator as unknown as { clearAppBadge(): Promise<void> };
  nav.clearAppBadge();
}
