"use client";

import { useState } from "react";
import { SocialCopy } from "@/lib/types";
import { publishToPlatform } from "@/lib/mock";
import Spinner from "./Spinner";

interface StepThreeProps {
  requestId: string;
  copies: SocialCopy[];
  onFinish: (finalCopies: SocialCopy[]) => void;
  onReset: () => void;
}

const platformMeta: Record<
  SocialCopy["platform"],
  { icon: string; label: string }
> = {
  X: { icon: "𝕏", label: "X (Twitter)" },
  LinkedIn: { icon: "in", label: "LinkedIn" },
  Newsletter: { icon: "✉", label: "Email Newsletter" },
};

type PlatformState = {
  phase: "idle" | "loading" | "published" | "error";
  message: string;
};

export default function StepThree({
  requestId,
  copies,
  onFinish,
  onReset,
}: StepThreeProps) {
  const [editedCopies, setEditedCopies] = useState<SocialCopy[]>(copies);
  const [platformStatus, setPlatformStatus] = useState<
    Record<string, PlatformState>
  >({
    X: { phase: "idle", message: "" },
    LinkedIn: { phase: "idle", message: "" },
    Newsletter: { phase: "idle", message: "" },
  });

  const updateCopy = (index: number, content: string) => {
    setEditedCopies((prev) =>
      prev.map((c, i) => (i === index ? { ...c, content } : c))
    );
  };

  const handlePlatformAction = async (
    platform: string,
    action: "publish" | "schedule",
    content: string
  ) => {
    setPlatformStatus((prev) => ({
      ...prev,
      [platform]: { phase: "loading", message: "Loading..." },
    }));

    await publishToPlatform(
      requestId,
      platform,
      action,
      content,
      (message: string) => {
        let phase: PlatformState["phase"] = "loading";
        if (message === "Published") phase = "published";
        if (message === "ERROR") phase = "error";
        setPlatformStatus((prev) => ({
          ...prev,
          [platform]: { phase, message },
        }));
      }
    );

    // Only force published if the callback didn't already set error
    setPlatformStatus((prev) => {
      if (prev[platform].phase === "error") return prev;
      return {
        ...prev,
        [platform]: { phase: "published", message: "Published" },
      };
    });
  };

  const allPublished = platformStatus.X.phase === "published" && 
                       platformStatus.LinkedIn.phase === "published" && 
                       platformStatus.Newsletter.phase === "published";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-black">
          Platform Adaptation
        </h2>
        <p className="text-sm text-gray-500">
          Review and edit the adapted content for each platform before
          publishing.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {editedCopies.map((copy, idx) => {
          const meta = platformMeta[copy.platform];
          const status = platformStatus[copy.platform];

          return (
            <div
              key={copy.platform}
              className="flex flex-col rounded-lg border border-gray-200 bg-white"
            >
              <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                <span className="text-base">{meta.icon}</span>
                <span className="text-sm font-medium text-black">
                  {meta.label}
                </span>
                {status.phase === "published" && (
                  <span className="ml-auto inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Done
                  </span>
                )}
              </div>
              <div className="flex-1 p-4">
                <textarea
                  value={copy.content}
                  onChange={(e) => updateCopy(idx, e.target.value)}
                  disabled={status.phase !== "idle"}
                  rows={status.phase === "idle" ? 10 : 12}
                  className={`h-full w-full resize-none border-none bg-transparent text-sm leading-relaxed text-gray-700 placeholder:text-gray-400 outline-none ${
                    status.phase !== "idle" ? "opacity-75" : ""
                  }`}
                />
              </div>

              {/* Card Bottom Area */}
              {status.phase === "idle" && (
                <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handlePlatformAction(copy.platform, "schedule", copy.content)}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlatformAction(copy.platform, "publish", copy.content)}
                    className="flex-1 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
                  >
                    Publish
                  </button>
                </div>
              )}
              {status.phase === "loading" && (
                <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 h-[52px]">
                  <Spinner />
                  <span className="text-xs text-gray-500">{status.message || "Loading..."}</span>
                </div>
              )}
              {status.phase === "error" && (
                <div className="flex items-center justify-between border-t border-red-200 bg-red-50 px-4 py-3">
                  <span className="text-xs font-medium text-red-600">Publishing failed</span>
                  <button
                    type="button"
                    onClick={() => setPlatformStatus((prev) => ({ ...prev, [copy.platform]: { phase: "idle", message: "" } }))}
                    className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allPublished && (
        <div className="mt-8 text-center">
          <p className="mb-4 text-sm text-gray-500">All platforms have been published/scheduled.</p>
          <button
            type="button"
            onClick={() => onFinish(editedCopies)}
            className="rounded-md bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800"
          >
            Wrap up & Start New
          </button>
        </div>
      )}
    </div>
  );
}
