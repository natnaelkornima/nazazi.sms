'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-white text-center">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-zinc-400 text-sm mb-4 max-w-md">
        An unexpected error occurred. Please try again or refresh the page.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
