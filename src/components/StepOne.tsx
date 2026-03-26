"use client";

import { useState, useEffect } from "react";
import { InputMode, IdeationPayload } from "@/lib/types";
import { getStatusMessage } from "@/lib/mock";
import { logger } from "@/lib/logger";
import { isValidUrl, isNonsense } from "@/lib/validation";
import Spinner from "./Spinner";

const LOADING_MESSAGES = [
  "Analyzing source material...",
  "Art Director generating angles...",
  "AI Writers drafting variants...",
  "Running SEO and structure checks...",
  "Finalizing content formatting...",
];

interface StepOneProps {
  isLoading: boolean;
  pollingStatus?: string;
  onSubmit: (payload: IdeationPayload) => void;
}

export default function StepOne({ isLoading, pollingStatus, onSubmit }: StepOneProps) {
  const [mode, setMode] = useState<InputMode>("idea");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 8000); // Change message every 8 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = () => {
    if (!content.trim()) return;

    // Clear previous errors
    setError(null);

    // 1. URL Validation
    if (mode === "url") {
      if (!isValidUrl(content.trim())) {
        setError("Please enter a valid URL starting with http:// or https://");
        return;
      }
    }

    // 2. Gibberish / Idea Validation
    if (mode === "idea") {
      const { valid, reason } = isNonsense(content.trim());
      if (!valid) {
        setError(reason || "Please provide a valid idea.");
        return;
      }
    }

    // 3. Request ID Validation (Basic)
    if (mode === "request_id") {
      if (content.trim().length < 5) {
        setError("Invalid Request ID format.");
        return;
      }
    }

    onSubmit({ mode, content: content.trim() });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-gray-200 bg-white p-10">
          <div className="flex flex-col items-center gap-6">
            {pollingStatus === "error" ? (
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xl font-bold">!</span>
              </div>
            ) : (
              <Spinner />
            )}
            <div className="text-center">
              <p className={`text-sm font-medium ${pollingStatus === "error" ? "text-red-600" : "text-black"}`}>
                {pollingStatus ? getStatusMessage(pollingStatus) : "Initializing…"}
              </p>
              {pollingStatus !== "error" ? (
                <p className="mt-1 text-xs text-gray-400">
                  This process typically takes 30-60 seconds.
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                  onClick={() => console.log("Reporting to IT...")}
                >
                  Report to IT
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-black">
          Content Ideation
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Provide a raw idea or a source URL to generate SEO article drafts.
        </p>

        {/* Toggle */}
        <div className="mb-5 flex rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => setMode("idea")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              mode === "idea"
                ? "bg-black text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            } rounded-l-md border-r border-gray-200`}
          >
            Raw Idea
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              mode === "url"
                ? "bg-black text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            } border-r border-gray-200`}
          >
            Source URL
          </button>
          <button
            type="button"
            onClick={() => setMode("request_id")}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              mode === "request_id"
                ? "bg-black text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            } rounded-r-md`}
          >
            Restore Session
          </button>
        </div>

        {/* Input */}
        {mode === "idea" ? (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Describe your content idea…"
            rows={5}
            className={`w-full resize-none rounded-md border bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 outline-none transition-all ${
              error ? "border-red-500 shadow-sm" : "border-gray-200 focus:border-black"
            }`}
          />
        ) : mode === "url" ? (
          <input
            type="url"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://example.com/source-article"
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 outline-none transition-all ${
              error ? "border-red-500 shadow-sm" : "border-gray-200 focus:border-black"
            }`}
          />
        ) : (
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. req_abc123xyz"
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 outline-none transition-all ${
              error ? "border-red-500 shadow-sm" : "border-gray-200 focus:border-black"
            }`}
          />
        )}

        {/* Error message */}
        {error && (
          <p className="mt-2 text-xs font-medium text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="mt-5 w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mode === "request_id" ? "Restore Drafts" : "Generate Drafts"}
        </button>
      </div>
    </div>
  );
}
