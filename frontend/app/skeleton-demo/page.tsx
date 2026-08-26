"use client";

/**
 * Skeleton Demo Page
 *
 * Showcases all available skeleton loading components.
 * This page is useful for:
 * - Testing skeleton appearances
 * - Verifying dark mode compatibility
 * - Developer reference
 */

import {
  CardGridSkeleton,
  CertificateCardSkeleton,
  DashboardWidgetSkeleton,
  FormSkeleton,
  ListItemSkeleton,
  PageHeaderSkeleton,
  Skeleton,
  StatsCardsSkeleton,
  TableSkeleton,
  TextLineSkeleton,
  TransactionListSkeleton,
} from "@/components/ui/Skeleton";

export default function SkeletonDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Skeleton Loading Components
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Content-aware loading placeholders for better perceived performance
          </p>
        </div>

        {/* Base Skeleton */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Base Skeleton
          </h2>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10" rounded="full" />
                <Skeleton className="h-10 flex-1" rounded="lg" />
              </div>
            </div>
          </div>
        </section>

        {/* Page Header Skeleton */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Page Header Skeleton
          </h2>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
            <PageHeaderSkeleton />
          </div>
        </section>

        {/* Stats Cards */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Stats Cards Skeleton
          </h2>
          <StatsCardsSkeleton count={3} />
        </section>

        {/* Certificate Card */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Certificate Card Skeleton
          </h2>
          <CertificateCardSkeleton />
        </section>

        {/* Transaction List */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Transaction List Skeleton
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <TransactionListSkeleton count={5} />
          </div>
        </section>

        {/* Table */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Table Skeleton
          </h2>
          <TableSkeleton rows={5} cols={4} />
        </section>

        {/* Card Grid */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Card Grid Skeleton
          </h2>
          <CardGridSkeleton count={6} />
        </section>

        {/* List Items */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            List Item Skeleton
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </section>

        {/* Form */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Form Skeleton
          </h2>
          <FormSkeleton />
        </section>

        {/* Dashboard Widget */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Dashboard Widget Skeleton
          </h2>
          <DashboardWidgetSkeleton />
        </section>

        {/* Text Lines */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Text Line Skeleton
          </h2>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
            <TextLineSkeleton width="full" />
            <TextLineSkeleton width={300} />
            <TextLineSkeleton width={200} />
          </div>
        </section>

        {/* Animated vs Static */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Animated vs Static
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                With Animation (Default)
              </p>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Without Animation
              </p>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" animate={false} />
                <Skeleton className="h-4 w-5/6" animate={false} />
                <Skeleton className="h-4 w-4/6" animate={false} />
              </div>
            </div>
          </div>
        </section>

        {/* Rounded Variants */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Rounded Variants
          </h2>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap gap-4">
              <div className="text-center">
                <Skeleton className="w-16 h-16 mb-2" rounded="none" />
                <p className="text-xs text-gray-600 dark:text-gray-400">None</p>
              </div>
              <div className="text-center">
                <Skeleton className="w-16 h-16 mb-2" rounded="sm" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Small</p>
              </div>
              <div className="text-center">
                <Skeleton className="w-16 h-16 mb-2" rounded="md" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Medium</p>
              </div>
              <div className="text-center">
                <Skeleton className="w-16 h-16 mb-2" rounded="lg" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Large</p>
              </div>
              <div className="text-center">
                <Skeleton className="w-16 h-16 mb-2" rounded="full" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Full</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
