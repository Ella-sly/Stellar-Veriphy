"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function SkeletonDemoPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Skeleton Component Demo
        </h1>

        <div className="space-y-12">
          {/* Text Skeleton */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Text Skeleton
            </h2>
            <div className="space-y-2">
              <Skeleton variant="text" className="w-full" />
              <Skeleton variant="text" className="w-5/6" />
              <Skeleton variant="text" className="w-4/6" />
            </div>
          </section>

          {/* Rectangle Skeleton */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Rectangle Skeleton
            </h2>
            <Skeleton variant="rect" className="w-full h-48" />
          </section>

          {/* Circle Skeleton */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Circle Skeleton
            </h2>
            <Skeleton variant="circle" />
          </section>

          {/* Card Loading State */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Card Loading State
            </h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton variant="circle" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-32" />
                  <Skeleton variant="text" className="w-24" />
                </div>
              </div>
              <Skeleton variant="rect" className="w-full h-32" />
              <div className="space-y-2">
                <Skeleton variant="text" className="w-full" />
                <Skeleton variant="text" className="w-5/6" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            backgroundPosition: -200% 0;
          }
          100% {
            backgroundPosition: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}
