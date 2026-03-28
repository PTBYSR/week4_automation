"use client";

import { useState, useEffect } from "react";
import { SocialCopy } from "@/lib/types";
import { publishToPlatform } from "@/lib/mock";
import { formatGoogleDriveUrl, stripMarkdown } from "@/lib/validation";
import Spinner from "./Spinner";

interface StepThreeProps {
  requestId: string;
  copies: SocialCopy[];
  onFinish: (finalCopies: SocialCopy[]) => void;
  onReset: () => void;
  onBackToDrafts: () => void;
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
  phase: "idle" | "loading" | "published" | "scheduled" | "error";
  message: string;
};

type PendingAction = {
  platform: SocialCopy["platform"];
  action: "publish" | "schedule";
  content: string;
  image_url?: string;
};

export default function StepThree({
  requestId,
  copies,
  onFinish,
  onBackToDrafts,
}: StepThreeProps) {
  // Initialize state with LinkedIn markdown stripped automatically
  const [editedCopies, setEditedCopies] = useState<SocialCopy[]>(() => 
    copies.map(c => 
      c.platform === "LinkedIn" 
        ? { ...c, content: stripMarkdown(c.content) } 
        : c
    )
  );

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  
  const [platformStatus, setPlatformStatus] = useState<
    Record<string, PlatformState>
  >({
    X: { phase: "idle", message: "" },
    LinkedIn: { phase: "idle", message: "" },
    Newsletter: { phase: "idle", message: "" },
  });

  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const updateCopy = (index: number, content: string) => {
    setEditedCopies((prev) =>
      prev.map((c, i) => (i === index ? { ...c, content } : c))
    );
  };

  // Auto-resize textareas on initial load
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  }, [editedCopies.length]); // Re-run if keys change

  const handlePlatformAction = async (
    platform: string,
    action: "publish" | "schedule",
    content: string,
    image_url?: string,
    scheduledTime?: string
  ) => {
    // Validation for scheduling
    if (action === "schedule" && !scheduledTime) {
      setScheduleError("Please select a date and time.");
      return;
    }

    if (action === "schedule" && scheduledTime) {
      const selected = new Date(scheduledTime);
      if (selected < new Date()) {
        setScheduleError("Cannot schedule a post in the past.");
        return;
      }
    }

    setPendingAction(null); // Clear modal
    setScheduledDateTime(""); // Reset picker
    setScheduleError(null);
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
        if (message === "Scheduled") phase = "scheduled";
        if (message === "ERROR") phase = "error";
        setPlatformStatus((prev) => ({
          ...prev,
          [platform]: { phase, message },
        }));
      },
      image_url,
      scheduledTime
    );

    // Only force published if the callback didn't already set error or scheduled
    setPlatformStatus((prev) => {
      if (prev[platform].phase === "error" || prev[platform].phase === "scheduled") return prev;
      return {
        ...prev,
        [platform]: { phase: "published", message: "Published" },
      };
    });
  };

  const allFinished = Object.values(platformStatus).every(
    (s) => s.phase === "published" || s.phase === "scheduled"
  );

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
              className="flex h-[600px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 shrink-0 bg-white z-10">
                <span className="text-base">{meta.icon}</span>
                <span className="text-sm font-medium text-black">
                  {meta.label}
                </span>
                
                {copy.platform === "Newsletter" && (
                  <button
                    onClick={() => setPreviewHtml(copy.content)}
                    className="ml-auto flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                )}

                {status.phase === "published" && (
                  <span className={`${copy.platform === "Newsletter" ? "ml-2" : "ml-auto"} inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20`}>
                    Published
                  </span>
                )}

                {status.phase === "scheduled" && (
                  <span className={`${copy.platform === "Newsletter" ? "ml-2" : "ml-auto"} inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20`}>
                    Scheduled
                  </span>
                )}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                <div className="p-4 pt-2">
                  {copy.image_url && (
                    <div 
                      className="group relative mb-5 overflow-hidden rounded-xl border border-gray-100 cursor-zoom-in shadow-sm"
                      onClick={() => setSelectedImage(copy.image_url!)}
                    >
                      <img
                        src={formatGoogleDriveUrl(copy.image_url)}
                        alt={`Generated graphic for ${copy.platform}`}
                        className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/20 group-hover:opacity-100">
                        <span className="rounded-full bg-white/95 p-3 text-black shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <textarea
                    value={copy.content}
                    onChange={(e) => {
                      updateCopy(idx, e.target.value);
                      // Auto-resize textarea height
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    disabled={status.phase !== "idle"}
                    placeholder={`Write your ${copy.platform} content...`}
                    rows={1}
                    style={{ overflow: 'hidden' }}
                    className={`w-full resize-none border-none bg-transparent px-0 text-[15px] leading-relaxed text-gray-800 placeholder:text-gray-400 focus:ring-0 ${
                      status.phase !== "idle" ? "opacity-75" : ""
                    }`}
                    onFocus={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                  />
                </div>
              </div>

              {/* Card Bottom Area (Sticky) */}
              <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 min-h-[52px]">
                {status.phase === "idle" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingAction({ 
                        platform: copy.platform, 
                        action: "schedule", 
                        content: copy.content,
                        image_url: copy.image_url 
                      })}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 active:bg-gray-200"
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingAction({ 
                        platform: copy.platform, 
                        action: "publish", 
                        content: copy.content,
                        image_url: copy.image_url 
                      })}
                      className="flex-1 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-gray-800 active:bg-gray-900"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={onBackToDrafts}
                      title="Back to drafts"
                      className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-black hover:border-black transition-all"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                )}
                {status.phase === "loading" && (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner />
                    <span className="text-xs text-gray-500">{status.message || "Processing..."}</span>
                  </div>
                )}
                {status.phase === "error" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-red-600">Failed</span>
                    <button
                      type="button"
                      onClick={() => setPlatformStatus((prev) => ({ ...prev, [copy.platform]: { phase: "idle", message: "" } }))}
                      className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {status.phase === "published" && (
                  <div className="flex items-center justify-center text-xs font-medium text-green-600 italic">
                    Successfully published to {copy.platform}
                  </div>
                )}
                {status.phase === "scheduled" && (
                  <div className="flex items-center justify-center text-xs font-medium text-blue-600 italic">
                    Scheduled for {copy.platform}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Confirm {pendingAction.action === "publish" ? "Publishing" : "Scheduling"}
            </h3>
            
            <p className="mb-4 text-sm text-gray-500 leading-relaxed">
              Are you sure you want to {pendingAction.action} this content to <span className="font-semibold text-gray-700">{platformMeta[pendingAction.platform].label}</span>? 
              This action will trigger the production workflow in n8n.
            </p>

            {pendingAction.action === "schedule" && (
              <div className="mb-6 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Select Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => {
                    setScheduledDateTime(e.target.value);
                    setScheduleError(null);
                  }}
                  className="w-full rounded-lg border-gray-200 bg-white text-sm text-gray-900 focus:border-black focus:ring-black"
                />
                {scheduleError && (
                  <p className="mt-2 text-xs font-medium text-red-500">{scheduleError}</p>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setScheduleError(null);
                  setScheduledDateTime("");
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePlatformAction(
                  pendingAction.platform, 
                  pendingAction.action, 
                  pendingAction.content,
                  pendingAction.image_url,
                  scheduledDateTime
                )}
                className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
              >
                Confirm & {pendingAction.action === 'publish' ? 'Publish' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={formatGoogleDriveUrl(selectedImage)}
              alt="Zoomed graphic"
              className="w-full rounded-lg shadow-2xl object-contain max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* HTML Preview Modal */}
      {previewHtml && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={() => setPreviewHtml(null)}
        >
          <div className="relative max-w-4xl w-full bg-white rounded-xl shadow-2xl flex flex-col h-[80vh]">
            <div className="flex items-center justify-between border-b border-gray-100 p-4 shrink-0">
              <h3 className="text-base font-semibold text-black flex items-center gap-2">
                <span className="text-base">✉</span> Email Preview
              </h3>
              <button 
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-black transition-all"
                onClick={() => setPreviewHtml(null)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 p-0 overflow-hidden bg-gray-50 rounded-b-xl">
              <iframe
                title="Newsletter Preview"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <style>
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                          line-height: 1.6; 
                          color: #374151; 
                          padding: 40px; 
                          max-width: 600px; 
                          margin: 0 auto; 
                          background-color: white;
                        }
                        img { max-width: 100%; height: auto; border-radius: 8px; }
                        h1, h2, h3 { color: #111827; }
                        a { color: #2563eb; }
                        ul, ol { padding-left: 20px; }
                      </style>
                    </head>
                    <body>
                      ${previewHtml}
                    </body>
                  </html>
                `}
                className="h-full w-full border-none"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      )}

      {allFinished && (
        <div className="mt-8 text-center pb-12">
          <p className="mb-4 text-sm text-gray-500">All platforms have been published or scheduled.</p>
          <button
            type="button"
            onClick={() => onFinish(editedCopies)}
            className="rounded-md bg-black px-8 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-gray-800 hover:scale-105 active:scale-95"
          >
            Finish Workflow & Save to History
          </button>
        </div>
      )}
    </div>
  );
}
