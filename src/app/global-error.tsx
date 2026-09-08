'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-white text-center">
        <h2 className="text-xl font-bold mb-2">Application Error</h2>
        <p className="text-zinc-400 text-sm mb-4 max-w-md">
          A critical error occurred while loading the application.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-colors"
        >
          Reload Application
        </button>
      </body>
    </html>
  );
}
