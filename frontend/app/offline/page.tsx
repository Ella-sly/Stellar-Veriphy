"use client";

/**
 * Offline Fallback Page
 *
 * Displayed when the user is offline and the requested page is not cached.
 */

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        // Check online status
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const handleRetry = () => {
        if (navigator.onLine) {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-8 flex justify-center">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <WifiOff className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                    You're Offline
                </h1>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {isOnline
                        ? "You're back online! Refresh the page to continue."
                        : "Check your internet connection and try again."}
                </p>

                {/* Status Indicator */}
                <div className="mb-8">
                    <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${isOnline
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                    >
                        <span
                            className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"
                                }`}
                        />
                        {isOnline ? "Connection Restored" : "No Connection"}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleRetry}
                        disabled={!isOnline}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        {isOnline ? "Reload Page" : "Waiting for Connection..."}
                    </button>

                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Go to Home
                    </Link>
                </div>

                {/* Cached Pages Info */}
                <div className="mt-12 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Tip:</strong> Some pages you've visited may still be available
                        offline. Try navigating using the menu.
                    </p>
                </div>

                {/* Additional Info */}
                <div className="mt-6 text-xs text-gray-500 dark:text-gray-500">
                    <p>This page works offline thanks to Service Worker caching</p>
                </div>
            </div>
        </div>
    );
}
