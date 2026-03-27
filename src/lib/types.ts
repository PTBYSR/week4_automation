// ─── Workflow State ───────────────────────────────────────────
export type StepNumber = 1 | 2 | 3;

export type InputMode = "idea" | "url" | "request_id";

export interface IdeationPayload {
  mode: InputMode;
  content: string;
}

export interface DraftArticle {
  id: string;
  title: string;
  style: string; // Maps to "angle" in n8n
  body: string;  // Maps to "content" in n8n
  image_prompt?: string;
  word_count?: number;
  image_url?: string;
}


export interface GenerateDraftsResponse {
  request_id: string;
  drafts: DraftArticle[];
}

export interface SocialCopy {
  platform: "X" | "LinkedIn" | "Newsletter";
  content: string;
  image_url?: string;
}

export interface AdaptContentResponse {
  copies: SocialCopy[];
}

export interface WorkflowState {
  currentStep: StepNumber;
  ideation: IdeationPayload | null;
  requestId: string | null;
  drafts: DraftArticle[];
  selectedDraft: DraftArticle | null;
  socialCopies: SocialCopy[];
  isLoading: boolean;
}

export const INITIAL_WORKFLOW_STATE: WorkflowState = {
  currentStep: 1,
  ideation: null,
  requestId: null,
  drafts: [],
  selectedDraft: null,
  socialCopies: [],
  isLoading: false,
};

export interface SavedWorkflow {
  id: string;
  timestamp: string;
  title: string;
  originalIdea: string;
  draft: DraftArticle;
  socialCopies: SocialCopy[];
}
