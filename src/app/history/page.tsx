"use client";

import { useEffect, useState } from "react";
import { SavedWorkflow } from "@/lib/types";
import { loadHistory } from "@/lib/storage";

export default function HistoryPage() {
  const [history, setHistory] = useState<SavedWorkflow[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-black">Workflow History</h1>
        <p className="text-sm text-gray-500">
          Review your past content generation cycles and published adaptations.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <svg
              className="h-6 w-6 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">No history yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Completed workflows will appear here once published.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col rounded-lg border border-gray-100 bg-white p-5 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-black">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                    {item.originalIdea}
                  </p>
                </div>
                <time className="text-[10px] text-gray-400">
                  {new Date(item.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-1">
                  {item.socialCopies.map((copy) => (
                    <div
                      key={copy.platform}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-gray-50 text-[10px] text-black shadow-sm"
                      title={copy.platform}
                    >
                      {copy.platform === "X"
                        ? "𝕏"
                        : copy.platform === "LinkedIn"
                        ? "in"
                        : "✉"}
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                  Published to {item.socialCopies.length} platforms
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
