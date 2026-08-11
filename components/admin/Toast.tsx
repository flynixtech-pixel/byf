"use client";

import { useEffect } from "react";

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white shadow-2xl">
      {message}
    </div>
  );
}
