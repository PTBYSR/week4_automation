"use client";

import { useState, useCallback } from "react";
import {
  WorkflowState,
  INITIAL_WORKFLOW_STATE,
  IdeationPayload,
  DraftArticle,
  SocialCopy,
} from "@/lib/types";
import { mockGenerateDrafts, mockAdaptContent, restoreSession } from "@/lib/mock";
import { saveToHistory } from "@/lib/storage";

import StepIndicator from "@/components/StepIndicator";
import StepOne from "@/components/StepOne";
import StepTwo from "@/components/StepTwo";
import StepThree from "@/components/StepThree";
import Toast from "@/components/Toast";

export default function Home() {
  const [state, setState] = useState<WorkflowState>(INITIAL_WORKFLOW_STATE);
  const [published, setPublished] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>("");
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  // ─── Step 1 → Step 2 ───────────────────────────────────────────
  const handleGenerateDrafts = useCallback(async (payload: IdeationPayload) => {
    setState((s) => ({ ...s, isLoading: true, ideation: payload }));

    // If restoring a session, use smart routing
    if (payload.mode === "request_id") {
      const result = await restoreSession(payload.content, (status) => {
        setPollingStatus(status);
      });

      if (result.targetStep === 3 && result.socialCopies) {
        // Jump straight to Step 3
        setState((s) => ({
          ...s,
          isLoading: false,
          currentStep: 3,
          requestId: result.requestId,
          socialCopies: result.socialCopies as SocialCopy[],
        }));
      } else {
        // Jump to Step 2 with drafts
        setState((s) => ({
          ...s,
          isLoading: false,
          currentStep: 2,
          requestId: result.requestId,
          drafts: result.drafts || [],
        }));
      }
      return;
    }

    const response = await mockGenerateDrafts(payload, (status) => {
      setPollingStatus(status);
    });

    setState((s) => ({
      ...s,
      isLoading: false,
      currentStep: 2,
      requestId: response.request_id,
      drafts: response.drafts,
    }));
  }, []);

  // ─── Step 2 → Step 3 ───────────────────────────────────────────
  const handleSelectDraft = useCallback(async (draft: DraftArticle) => {
    setState((s) => ({ ...s, isLoading: true, selectedDraft: draft }));
    setPollingStatus(""); // Reset polling status for the next step

    const response = await mockAdaptContent(
      state.requestId!,
      draft,
      (status) => setPollingStatus(status)
    );

    setState((s) => ({
      ...s,
      isLoading: false,
      currentStep: 3,
      socialCopies: response.copies,
    }));
  }, [state.requestId]);

  // ─── Step 3: Finish & Save to History ──────────────────────────
  const handleFinish = useCallback((finalCopies: SocialCopy[]) => {
    if (state.selectedDraft) {
      saveToHistory({
        id: state.requestId || Math.random().toString(36).slice(2),
        timestamp: new Date().toISOString(),
        title: state.selectedDraft.title,
        originalIdea: state.ideation?.content || "",
        draft: state.selectedDraft,
        socialCopies: finalCopies,
      });
    }

    setState((s) => ({ ...s, isLoading: false }));
    setPublished(true);
    setToast({ visible: true, message: "Workflow finished and saved to history." });
  }, [state.selectedDraft, state.requestId, state.ideation]);

  // ─── Reset ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setState(INITIAL_WORKFLOW_STATE);
    setPublished(false);
  }, []);

  return (
    <>
      {/* Step indicator */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white">
        <StepIndicator currentStep={state.currentStep} />
      </div>

      {/* Step views */}
      {state.currentStep === 1 && (
        <StepOne isLoading={state.isLoading} pollingStatus={pollingStatus} onSubmit={handleGenerateDrafts} />
      )}

      {state.currentStep === 2 && (
        <StepTwo
          drafts={state.drafts}
          isLoading={state.isLoading}
          pollingStatus={pollingStatus}
          onSelect={handleSelectDraft}
        />
      )}

      {state.currentStep === 3 && (
        <StepThree
          requestId={state.requestId!}
          copies={state.socialCopies}
          onFinish={handleFinish}
          onReset={handleReset}
        />
      )}

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        onClose={() => setToast({ visible: false, message: "" })}
      />
    </>
  );
}
