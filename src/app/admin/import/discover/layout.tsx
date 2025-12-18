"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md bg-white rounded-lg shadow-lg">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">Product Discovery Error</h2>
            <p className="text-gray-600 mb-6">
              The search encountered an issue. This usually happens when the server times out on large searches.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
              >
                Reload Page
              </button>
              <p className="text-sm text-gray-500">
                Tip: Try searching for fewer products (25 or 10) to avoid timeouts.
              </p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
