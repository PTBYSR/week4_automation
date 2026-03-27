"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { DraftArticle } from "@/lib/types";
import { getStatusMessage } from "@/lib/mock";
import { logger } from "@/lib/logger";
import { formatGoogleDriveUrl } from "@/lib/validation";
import Spinner from "./Spinner";

interface StepTwoProps {
  drafts: DraftArticle[];
  isLoading: boolean;
  pollingStatus?: string;
  onSelect: (draft: DraftArticle) => void;
}

export default function StepTwo({ drafts, isLoading, pollingStatus, onSelect }: StepTwoProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
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
                {pollingStatus ? getStatusMessage(pollingStatus) : "Adapting content for platforms…"}
              </p>
              {pollingStatus === "error" && (
                <button
                  type="button"
                  className="mt-4 rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                  onClick={() => console.log("Reporting to IT from StepTwo...")}
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

  const activeDraft = drafts[activeTab];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {drafts.map((draft, idx) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`flex-1 px-4 py-3 text-sm transition-colors ${
                idx === activeTab
                  ? "border-b-2 border-black font-medium text-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {draft.style}
            </button>
          ))}
        </div>

        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-black">
              {activeDraft.title}
            </h3>
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {activeDraft.style}
            </span>
            {activeDraft.word_count && (
              <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-500">
                {activeDraft.word_count} words
              </span>
            )}
          </div>

          <div className="max-h-[500px] overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-6">
            {activeDraft.image_url && (
              <div className="mb-6 overflow-hidden rounded-md border border-gray-200">
                <img
                  src={formatGoogleDriveUrl(activeDraft.image_url)}
                  alt={`Generated graphic for ${activeDraft.title}`}
                  className="w-full object-cover"
                />
              </div>
            )}
            <div className="prose prose-sm prose-gray max-w-none prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500">
              <ReactMarkdown>{activeDraft.body}</ReactMarkdown>
            </div>
          </div>

          {/* Select button */}
          <button
            type="button"
            onClick={() => onSelect(activeDraft)}
            className="mt-5 w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Select This Draft
          </button>
        </div>
      </div>
    </div>
  );
}
