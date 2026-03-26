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

export default function StepThree({
  requestId,
  copies,
  onFinish,
  onReset,
}: StepThreeProps) {
  const [editedCopies, setEditedCopies] = useState<SocialCopy[]>(copies);
  const [platformStatus, setPlatformStatus] = useState<
    Record<string, { status: "idle" | "loading" | "published"; message: string }>
  >({
    X: { status: "idle", message: "" },
    LinkedIn: { status: "idle", message: "" },
    Newsletter: { status: "idle", message: "" },
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
      [platform]: { status: "loading", message: "Initialing..." }
    }));

    await publishToPlatform(requestId, platform, action, content, (msg) => {
      setPlatformStatus((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], message: msg }
      }));
    });

    setPlatformStatus((prev) => ({
      ...prev,
      [platform]: { status: "published", message: "" }
    }));
  };

  const allPublished = platformStatus.X.status === "published" && 
                       platformStatus.LinkedIn.status === "published" && 
                       platformStatus.Newsletter.status === "published";

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
                {status.status === "published" && (
                  <span className="ml-auto inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Done
                  </span>
                )}
              </div>
              <div className="flex-1 p-4">
                <textarea
                  value={copy.content}
                  onChange={(e) => updateCopy(idx, e.target.value)}
                  disabled={status.status !== "idle"}
                  rows={status.status === "idle" ? 10 : 12}
                  className={`h-full w-full resize-none border-none bg-transparent text-sm leading-relaxed text-gray-700 placeholder:text-gray-400 outline-none ${
                    status.status !== "idle" ? "opacity-75" : ""
                  }`}
                />
              </div>

              {/* Card Bottom Area */}
              {status.status === "idle" && (
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
              {status.status === "loading" && (
                <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 h-[52px]">
                  <Spinner />
                  <span className="text-xs text-gray-500">{status.message || "Processing..."}</span>
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
