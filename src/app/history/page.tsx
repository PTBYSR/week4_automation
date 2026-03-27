"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";

interface HistoryItem {
  id: string;
  status: string;
  createdAt: string;
  title?: string;
  style?: string;
  imageUrl?: string;
  platforms: {
    X: string;
    LinkedIn: string;
    Newsletter: string;
  };
  content?: {
    twitter?: string;
    linkedin?: string;
    newsletter?: string;
  };
  sourceUrl?: string;
  rawContent?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.records) setHistory(data.records);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner />
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-black">Pipeline History</h1>
        <p className="mt-2 text-sm text-gray-500">
          Revisit and restore any of your past content generation cycles from Airtable.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-24 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
            <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-900">No pipelines found</p>
          <p className="mt-2 text-sm text-gray-500 max-w-xs">
            Completed or in-progress workflows from Airtable will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-black/10 hover:shadow-xl"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-mono font-medium text-gray-400">
                      {item.id}
                    </span>
                    <time className="shrink-0 text-[10px] text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-black">
                    {item.title || "Untitled Pipeline"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-gray-100">
                      {item.style || "Standard"}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      item.status.includes('Published') ? 'bg-green-500' : 
                      item.status.includes('waiting') ? 'bg-amber-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-[10px] text-gray-400 capitalize">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Source Content Preview */}
              {(item.sourceUrl || item.rawContent) && (
                <div className="mt-4 rounded-xl bg-gray-50/80 p-3 ring-1 ring-inset ring-gray-100/50">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Source
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600 leading-relaxed">
                    {item.sourceUrl || item.rawContent}
                  </p>
                </div>
              )}

              {/* Platform Status */}
              <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2">
                  {[
                    { key: 'Newsletter', icon: '✉', status: item.platforms.Newsletter },
                    { key: 'X', icon: '𝕏', status: item.platforms.X },
                    { key: 'LinkedIn', icon: 'in', status: item.platforms.LinkedIn }
                  ].map((p) => (
                    <div
                      key={p.key}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border border-gray-100 text-[11px] font-medium shadow-sm transition-all ${
                        p.status === 'Published' 
                          ? 'bg-black text-white' 
                          : 'bg-white text-gray-400'
                      }`}
                      title={`${p.key}: ${p.status}`}
                    >
                      {p.icon}
                    </div>
                  ))}
                </div>

                <Link
                  href={`/?request_id=${item.id}`}
                  className="rounded-lg bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-black ring-1 ring-gray-200 transition-all hover:bg-black hover:text-white hover:ring-black"
                >
                  Restore
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
